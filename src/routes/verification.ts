import { Router } from 'express';
import { AuthenticatedRequest, authenticateSignature } from '../middleware/auth';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { IdentityService } from '../services/IdentityService';
import { logger } from '../utils/logger';
import { CryptoUtils } from '../utils/crypto';

const router = Router();

/**
 * POST /api/verification/request
 * Request verification from a subject
 */
router.post('/request', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { address } = req.user!;

  const {
    subject,
    requiredAttributes,
    useZKProof,
    verificationContext,
    expiresIn
  } = req.body;

  if (!subject || !requiredAttributes || !Array.isArray(requiredAttributes)) {
    throw new BadRequestError('subject and requiredAttributes array are required');
  }

  // Check if subject has an identity
  const subjectIdentity = identityService.getIdentityByOwner(subject);
  if (!subjectIdentity) {
    throw new NotFoundError('Subject identity not found');
  }

  // Generate verification request ID
  const requestId = CryptoUtils.generateSecureRandomString();
  const challenge = CryptoUtils.generateZKChallenge(
    subject,
    address,
    CryptoUtils.generateNonce()
  );

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (expiresIn || 60)); // Default 1 hour

  const verificationRequest = {
    id: requestId,
    verifier: address,
    subject,
    requiredAttributes,
    useZKProof: useZKProof || false,
    challenge,
    context: verificationContext,
    status: 'pending',
    createdAt: new Date(),
    expiresAt,
    response: null
  };

  // Store verification request (in production, use a database)
  if (!req.app.locals.verificationRequests) {
    req.app.locals.verificationRequests = new Map();
  }
  req.app.locals.verificationRequests.set(requestId, verificationRequest);

  // If using ZK proofs, create ZK verification request
  let zkRequestId = null;
  if (useZKProof) {
    try {
      zkRequestId = await identityService.requestZKVerification({
        verifier: address,
        subject,
        requiredAttributes,
        useZKProof: true
      });
    } catch (error) {
      logger.warn('Failed to create ZK verification request:', error);
    }
  }

  res.status(201).json({
    success: true,
    verificationRequest: {
      id: requestId,
      verifier: address,
      subject,
      requiredAttributes,
      useZKProof: useZKProof || false,
      challenge,
      zkRequestId,
      status: 'pending',
      expiresAt,
      context: verificationContext
    },
    message: 'Verification request created successfully'
  });

  logger.info('Verification request created', {
    requestId,
    verifier: address,
    subject,
    useZKProof: useZKProof || false,
    attributeCount: requiredAttributes.length
  });
}));

/**
 * GET /api/verification/requests/:id
 * Get verification request details
 */
router.get('/requests/:id', asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const verificationRequests = req.app.locals.verificationRequests || new Map();
  
  const request = verificationRequests.get(requestId);
  if (!request) {
    throw new NotFoundError('Verification request not found');
  }

  res.json({
    success: true,
    verificationRequest: request
  });
}));

/**
 * POST /api/verification/respond/:id
 * Respond to a verification request
 */
router.post('/respond/:id', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { address } = req.user!;
  const requestId = req.params.id;

  const verificationRequests = req.app.locals.verificationRequests || new Map();
  const request = verificationRequests.get(requestId);

  if (!request) {
    throw new NotFoundError('Verification request not found');
  }

  if (request.subject.toLowerCase() !== address.toLowerCase()) {
    throw new BadRequestError('You are not the subject of this verification request');
  }

  if (request.status !== 'pending') {
    throw new BadRequestError('Verification request is no longer pending');
  }

  if (new Date() > new Date(request.expiresAt)) {
    throw new BadRequestError('Verification request has expired');
  }

  const {
    approve,
    credentialIds,
    selectiveDisclosure,
    zkProofData
  } = req.body;

  if (!approve) {
    // Reject the verification request
    request.status = 'rejected';
    request.response = {
      approved: false,
      timestamp: new Date(),
      reason: req.body.reason || 'Request rejected by subject'
    };

    verificationRequests.set(requestId, request);

    res.json({
      success: true,
      message: 'Verification request rejected',
      verificationRequest: request
    });

    logger.info('Verification request rejected', {
      requestId,
      subject: address,
      verifier: request.verifier
    });

    return;
  }

  // Get subject's identity
  const identity = identityService.getIdentityByOwner(address);
  if (!identity) {
    throw new NotFoundError('Subject identity not found');
  }

  let response: any = {
    approved: true,
    timestamp: new Date(),
    subject: address,
    subjectDID: identity.did
  };

  if (request.useZKProof && zkProofData) {
    // Handle ZK proof verification
    try {
      const proofType = identityService['determineProofType'](request.requiredAttributes);
      const isValidProof = await identityService.submitZKProof(
        requestId,
        proofType,
        zkProofData
      );

      response.zkProof = {
        valid: isValidProof,
        proofType,
        proofHash: CryptoUtils.hash(JSON.stringify(zkProofData))
      };

      if (!isValidProof) {
        throw new BadRequestError('Invalid zero-knowledge proof');
      }
    } catch (error) {
      logger.error('ZK proof verification failed:', error);
      throw new BadRequestError('Zero-knowledge proof verification failed');
    }
  } else {
    // Handle standard credential presentation
    if (!credentialIds || !Array.isArray(credentialIds)) {
      throw new BadRequestError('credentialIds array is required for standard verification');
    }

    // Verify that user owns the requested credentials
    const userCredentialIds = identity.credentials.map(cred => cred.id);
    const invalidCredentials = credentialIds.filter(id => !userCredentialIds.includes(id));

    if (invalidCredentials.length > 0) {
      throw new BadRequestError(`You don't own these credentials: ${invalidCredentials.join(', ')}`);
    }

    // Create verifiable presentation
    let presentation;
    if (selectiveDisclosure) {
      // Handle selective disclosure
      const selectivePresentation = await identityService.createSelectiveDisclosurePresentation({
        credentialId: credentialIds[0], // For demo, using first credential
        attributesToDisclose: selectiveDisclosure.attributesToDisclose || request.requiredAttributes,
        verifier: request.verifier,
        challenge: request.challenge
      });
      presentation = selectivePresentation;
    } else {
      // Standard presentation
      presentation = await identity.createPresentation(
        credentialIds,
        request.challenge
      );
    }

    response.presentation = presentation;
  }

  // Update request status
  request.status = 'completed';
  request.response = response;
  verificationRequests.set(requestId, request);

  res.json({
    success: true,
    message: 'Verification response submitted successfully',
    verificationRequest: request
  });

  logger.info('Verification request completed', {
    requestId,
    subject: address,
    verifier: request.verifier,
    useZKProof: request.useZKProof,
    approved: true
  });
}));

/**
 * GET /api/verification/requests
 * Get verification requests for the authenticated user
 */
router.get('/requests', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  const { status, role } = req.query;

  const verificationRequests = req.app.locals.verificationRequests || new Map();
  const allRequests = Array.from(verificationRequests.values());

  let filteredRequests = allRequests.filter(request => {
    if (role === 'verifier') {
      return request.verifier.toLowerCase() === address.toLowerCase();
    } else if (role === 'subject') {
      return request.subject.toLowerCase() === address.toLowerCase();
    } else {
      // Return requests where user is either verifier or subject
      return request.verifier.toLowerCase() === address.toLowerCase() ||
             request.subject.toLowerCase() === address.toLowerCase();
    }
  });

  // Filter by status if specified
  if (status) {
    filteredRequests = filteredRequests.filter(request => request.status === status);
  }

  // Sort by creation date (newest first)
  filteredRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    requests: filteredRequests,
    count: filteredRequests.length,
    filters: {
      status: status || 'all',
      role: role || 'all'
    }
  });
}));

/**
 * POST /api/verification/verify-presentation
 * Verify a presentation submitted in response to a verification request
 */
router.post('/verify-presentation', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { address } = req.user!;

  const { requestId, presentation } = req.body;

  if (!requestId || !presentation) {
    throw new BadRequestError('requestId and presentation are required');
  }

  const verificationRequests = req.app.locals.verificationRequests || new Map();
  const request = verificationRequests.get(requestId);

  if (!request) {
    throw new NotFoundError('Verification request not found');
  }

  if (request.verifier.toLowerCase() !== address.toLowerCase()) {
    throw new BadRequestError('You are not the verifier for this request');
  }

  if (request.status !== 'completed') {
    throw new BadRequestError('Verification request is not completed');
  }

  // Verify the presentation
  const isValid = await identityService.verifyPresentation(presentation);

  // Additional checks
  const verificationResult = {
    valid: isValid,
    timestamp: new Date(),
    verifier: address,
    checks: {
      presentationValid: isValid,
      challengeMatches: presentation.proof?.challenge === request.challenge,
      holderMatches: presentation.holder.toLowerCase() === request.subject.toLowerCase(),
      notExpired: new Date() <= new Date(request.expiresAt),
      credentialsValid: true // Would verify each credential individually
    }
  };

  // Check if all required attributes are present
  const providedAttributes = new Set();
  presentation.verifiableCredential.forEach((cred: any) => {
    Object.keys(cred.credentialSubject).forEach(attr => {
      if (attr !== 'id') providedAttributes.add(attr);
    });
  });

  const missingAttributes = request.requiredAttributes.filter((attr: string) => 
    !providedAttributes.has(attr)
  );

  verificationResult.checks.credentialsValid = missingAttributes.length === 0;

  const finalResult = Object.values(verificationResult.checks).every(check => check === true);

  res.json({
    success: true,
    verificationResult: {
      ...verificationResult,
      valid: finalResult,
      missingAttributes,
      providedAttributes: Array.from(providedAttributes)
    },
    request: {
      id: requestId,
      requiredAttributes: request.requiredAttributes,
      subject: request.subject
    }
  });

  logger.info('Presentation verification completed', {
    requestId,
    verifier: address,
    subject: request.subject,
    isValid: finalResult,
    missingAttributeCount: missingAttributes.length
  });
}));

/**
 * DELETE /api/verification/requests/:id
 * Cancel a verification request (only by verifier)
 */
router.delete('/requests/:id', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  const requestId = req.params.id;

  const verificationRequests = req.app.locals.verificationRequests || new Map();
  const request = verificationRequests.get(requestId);

  if (!request) {
    throw new NotFoundError('Verification request not found');
  }

  if (request.verifier.toLowerCase() !== address.toLowerCase()) {
    throw new BadRequestError('Only the verifier can cancel this request');
  }

  if (request.status !== 'pending') {
    throw new BadRequestError('Can only cancel pending verification requests');
  }

  request.status = 'cancelled';
  request.response = {
    cancelled: true,
    timestamp: new Date(),
    reason: req.body.reason || 'Cancelled by verifier'
  };

  verificationRequests.set(requestId, request);

  res.json({
    success: true,
    message: 'Verification request cancelled successfully',
    verificationRequest: request
  });

  logger.info('Verification request cancelled', {
    requestId,
    verifier: address,
    subject: request.subject
  });
}));

/**
 * GET /api/verification/statistics
 * Get verification statistics for the authenticated user
 */
router.get('/statistics', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  
  const verificationRequests = req.app.locals.verificationRequests || new Map();
  const allRequests = Array.from(verificationRequests.values());

  const asVerifier = allRequests.filter(req => 
    req.verifier.toLowerCase() === address.toLowerCase()
  );

  const asSubject = allRequests.filter(req => 
    req.subject.toLowerCase() === address.toLowerCase()
  );

  const stats = {
    asVerifier: {
      total: asVerifier.length,
      pending: asVerifier.filter(req => req.status === 'pending').length,
      completed: asVerifier.filter(req => req.status === 'completed').length,
      rejected: asVerifier.filter(req => req.status === 'rejected').length,
      cancelled: asVerifier.filter(req => req.status === 'cancelled').length
    },
    asSubject: {
      total: asSubject.length,
      pending: asSubject.filter(req => req.status === 'pending').length,
      completed: asSubject.filter(req => req.status === 'completed').length,
      rejected: asSubject.filter(req => req.status === 'rejected').length,
      cancelled: asSubject.filter(req => req.status === 'cancelled').length
    },
    overall: {
      totalParticipation: asVerifier.length + asSubject.length,
      successRate: {
        asVerifier: asVerifier.length > 0 ? 
          (asVerifier.filter(req => req.status === 'completed').length / asVerifier.length) * 100 : 0,
        asSubject: asSubject.length > 0 ? 
          (asSubject.filter(req => req.status === 'completed').length / asSubject.length) * 100 : 0
      }
    }
  };

  res.json({
    success: true,
    statistics: stats,
    user: {
      address,
      role: 'participant'
    }
  });
}));

export default router;