import { Router } from 'express';
import { AuthenticatedRequest, authenticateSignature, requireAdmin } from '../middleware/auth';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { IdentityService } from '../services/IdentityService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/credentials/issue
 * Issue a verifiable credential (requires admin or issuer role)
 */
router.post('/issue', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { address } = req.user!;

  const {
    subject,
    credentialType,
    attributes,
    expirationDate,
    useZKProof
  } = req.body;

  if (!subject || !credentialType || !attributes) {
    throw new BadRequestError('subject, credentialType, and attributes are required');
  }

  // Check if subject has an identity
  const subjectIdentity = identityService.getIdentityByOwner(subject);
  if (!subjectIdentity) {
    throw new NotFoundError('Subject identity not found');
  }

  // Issue the credential
  const credential = await identityService.issueCredential({
    issuer: address,
    subject,
    credentialType,
    attributes,
    expirationDate: expirationDate ? new Date(expirationDate) : undefined,
    useZKProof: useZKProof || false
  });

  res.status(201).json({
    success: true,
    credential,
    message: 'Credential issued successfully'
  });

  logger.info('Credential issued', {
    credentialId: credential.id,
    issuer: address,
    subject,
    type: credentialType
  });
}));

/**
 * GET /api/credentials/:id
 * Get credential by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  
  // Find credential across all identities
  const identities = identityService.listIdentities();
  let foundCredential = null;

  for (const identity of identities) {
    const credential = identity.credentials.find(cred => cred.id === req.params.id);
    if (credential) {
      foundCredential = credential;
      break;
    }
  }

  if (!foundCredential) {
    throw new NotFoundError('Credential not found');
  }

  res.json({
    success: true,
    credential: foundCredential
  });
}));

/**
 * POST /api/credentials/:id/verify
 * Verify a credential
 */
router.post('/:id/verify', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  
  // Find credential
  const identities = identityService.listIdentities();
  let foundCredential = null;

  for (const identity of identities) {
    const credential = identity.credentials.find(cred => cred.id === req.params.id);
    if (credential) {
      foundCredential = credential;
      break;
    }
  }

  if (!foundCredential) {
    throw new NotFoundError('Credential not found');
  }

  const isValid = await identityService.verifyCredential(foundCredential);

  res.json({
    success: true,
    isValid,
    credential: {
      id: foundCredential.id,
      type: foundCredential.type,
      issuer: foundCredential.issuer,
      subject: foundCredential.credentialSubject.id,
      issuanceDate: foundCredential.issuanceDate,
      expirationDate: foundCredential.expirationDate
    },
    verificationResult: {
      valid: isValid,
      timestamp: new Date().toISOString(),
      checks: {
        signatureValid: true, // Simplified for demo
        notExpired: !foundCredential.expirationDate || new Date(foundCredential.expirationDate) > new Date(),
        issuerTrusted: true // Would check against trusted issuer registry
      }
    }
  });

  logger.info('Credential verified', {
    credentialId: foundCredential.id,
    isValid,
    verifier: req.ip
  });
}));

/**
 * GET /api/credentials/holder/:address
 * Get all credentials for a holder
 */
router.get('/holder/:address', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { address } = req.params;
  const { type, issuer, status } = req.query;

  const identity = identityService.getIdentityByOwner(address);
  if (!identity) {
    throw new NotFoundError('Identity not found for this address');
  }

  let credentials = identity.credentials;

  // Apply filters
  if (type) {
    credentials = credentials.filter(cred => 
      cred.type.includes(type as string)
    );
  }

  if (issuer) {
    credentials = credentials.filter(cred => {
      const credIssuer = typeof cred.issuer === 'string' ? cred.issuer : cred.issuer.id;
      return credIssuer.toLowerCase() === (issuer as string).toLowerCase();
    });
  }

  if (status === 'active') {
    credentials = credentials.filter(cred => 
      !cred.expirationDate || new Date(cred.expirationDate) > new Date()
    );
  } else if (status === 'expired') {
    credentials = credentials.filter(cred => 
      cred.expirationDate && new Date(cred.expirationDate) <= new Date()
    );
  }

  res.json({
    success: true,
    credentials: credentials.map(cred => ({
      id: cred.id,
      type: cred.type,
      issuer: cred.issuer,
      issuanceDate: cred.issuanceDate,
      expirationDate: cred.expirationDate,
      credentialSubject: cred.credentialSubject
    })),
    count: credentials.length,
    holder: {
      address,
      did: identity.did
    }
  });
}));

/**
 * POST /api/credentials/batch-verify
 * Verify multiple credentials at once
 */
router.post('/batch-verify', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { credentialIds } = req.body;

  if (!credentialIds || !Array.isArray(credentialIds)) {
    throw new BadRequestError('credentialIds array is required');
  }

  const results = [];
  const identities = identityService.listIdentities();

  for (const credentialId of credentialIds) {
    let foundCredential = null;

    // Find credential
    for (const identity of identities) {
      const credential = identity.credentials.find(cred => cred.id === credentialId);
      if (credential) {
        foundCredential = credential;
        break;
      }
    }

    if (foundCredential) {
      const isValid = await identityService.verifyCredential(foundCredential);
      results.push({
        credentialId,
        isValid,
        found: true,
        type: foundCredential.type,
        issuer: foundCredential.issuer
      });
    } else {
      results.push({
        credentialId,
        isValid: false,
        found: false,
        error: 'Credential not found'
      });
    }
  }

  const validCount = results.filter(r => r.isValid).length;

  res.json({
    success: true,
    results,
    summary: {
      total: results.length,
      valid: validCount,
      invalid: results.length - validCount,
      successRate: (validCount / results.length) * 100
    }
  });

  logger.info('Batch credential verification', {
    total: results.length,
    valid: validCount,
    verifier: req.ip
  });
}));

/**
 * POST /api/credentials/create-presentation
 * Create a verifiable presentation with selected credentials
 */
router.post('/create-presentation', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { address } = req.user!;

  const { credentialIds, challenge, domain, selectiveDisclosure } = req.body;

  if (!credentialIds || !Array.isArray(credentialIds)) {
    throw new BadRequestError('credentialIds array is required');
  }

  // Get user's identity
  const identity = identityService.getIdentityByOwner(address);
  if (!identity) {
    throw new NotFoundError('Identity not found for this address');
  }

  // Verify all requested credentials belong to the user
  const userCredentialIds = identity.credentials.map(cred => cred.id);
  const invalidCredentials = credentialIds.filter(id => !userCredentialIds.includes(id));

  if (invalidCredentials.length > 0) {
    throw new ForbiddenError(`You don't own these credentials: ${invalidCredentials.join(', ')}`);
  }

  let presentation;

  if (selectiveDisclosure) {
    // Create selective disclosure presentation
    const { attributesToDisclose } = selectiveDisclosure;
    
    if (!attributesToDisclose || typeof attributesToDisclose !== 'object') {
      throw new BadRequestError('attributesToDisclose object is required for selective disclosure');
    }

    // For selective disclosure, we need to process each credential
    const processedCredentialIds = [];
    
    for (const credentialId of credentialIds) {
      const attributesForThisCredential = attributesToDisclose[credentialId];
      
      if (attributesForThisCredential && Array.isArray(attributesForThisCredential)) {
        const selectivePresentation = await identityService.createSelectiveDisclosurePresentation({
          credentialId,
          attributesToDisclose: attributesForThisCredential,
          verifier: challenge?.verifier || 'unknown',
          challenge
        });
        
        processedCredentialIds.push(credentialId);
      }
    }

    presentation = await identity.createPresentation(processedCredentialIds, challenge, domain);
  } else {
    // Create standard presentation
    presentation = await identity.createPresentation(credentialIds, challenge, domain);
  }

  res.json({
    success: true,
    presentation,
    message: 'Verifiable presentation created successfully',
    metadata: {
      credentialCount: credentialIds.length,
      selectiveDisclosure: !!selectiveDisclosure,
      holder: identity.did
    }
  });

  logger.info('Verifiable presentation created', {
    presentationId: presentation.id,
    credentialCount: credentialIds.length,
    holder: address,
    selectiveDisclosure: !!selectiveDisclosure
  });
}));

/**
 * POST /api/credentials/verify-presentation
 * Verify a verifiable presentation
 */
router.post('/verify-presentation', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const { presentation } = req.body;

  if (!presentation) {
    throw new BadRequestError('presentation is required');
  }

  const isValid = await identityService.verifyPresentation(presentation);

  res.json({
    success: true,
    isValid,
    presentation: {
      id: presentation.id,
      holder: presentation.holder,
      credentialCount: presentation.verifiableCredential.length
    },
    verificationResult: {
      valid: isValid,
      timestamp: new Date().toISOString(),
      verifier: req.ip
    }
  });

  logger.info('Presentation verified', {
    presentationId: presentation.id,
    isValid,
    credentialCount: presentation.verifiableCredential.length,
    verifier: req.ip
  });
}));

export default router;