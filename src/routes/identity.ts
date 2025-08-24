import { Router } from 'express';
import { AuthenticatedRequest, authenticateSignature, checkIdentityOwnership, generateToken } from '../middleware/auth';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { IdentityService } from '../services/IdentityService';
import { logger } from '../utils/logger';
import { CryptoUtils } from '../utils/crypto';

const router = Router();

/**
 * POST /api/identities/auth
 * Authenticate user with Ethereum signature
 */
router.post('/auth', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  const identityService: IdentityService = req.app.locals.identityService;

  // Check if user already has an identity
  const existingIdentity = identityService.getIdentityByOwner(address);
  
  const token = generateToken(address, existingIdentity?.id);
  
  res.json({
    success: true,
    token,
    user: {
      address,
      hasIdentity: !!existingIdentity,
      identityId: existingIdentity?.id,
      did: existingIdentity?.did
    }
  });

  logger.info('User authenticated', { address, hasIdentity: !!existingIdentity });
}));

/**
 * POST /api/identities
 * Create a new digital identity
 */
router.post('/', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  const identityService: IdentityService = req.app.locals.identityService;

  // Check if user already has an identity
  const existingIdentity = identityService.getIdentityByOwner(address);
  if (existingIdentity) {
    throw new BadRequestError('Identity already exists for this address');
  }

  // Create new identity
  const identity = await identityService.createIdentity({
    owner: address,
    keyPair: req.body.keyPair
  });

  res.status(201).json({
    success: true,
    identity: {
      id: identity.id,
      did: identity.did,
      owner: identity.metadata.owner,
      created: identity.metadata.created,
      didDocument: identity.didDocument
    }
  });

  logger.info('New identity created', { 
    identityId: identity.id, 
    did: identity.did, 
    owner: address 
  });
}));

/**
 * GET /api/identities/:id
 * Get identity by ID
 */
router.get('/:id', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  const exported = identity.export();
  
  res.json({
    success: true,
    identity: {
      ...exported,
      summary: identity.getSummary(),
      credentialCount: identity.credentials.length,
      isValid: identity.validate().isValid
    }
  });
}));

/**
 * PUT /api/identities/:id
 * Update identity DID document
 */
router.put('/:id', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  const { didDocument, serviceEndpoints, verificationMethods } = req.body;

  // Update DID document if provided
  if (didDocument) {
    identity.updateDIDDocument(didDocument);
  }

  // Add service endpoints if provided
  if (serviceEndpoints && Array.isArray(serviceEndpoints)) {
    serviceEndpoints.forEach(service => {
      identity.addServiceEndpoint(service);
    });
  }

  // Add verification methods if provided
  if (verificationMethods && Array.isArray(verificationMethods)) {
    verificationMethods.forEach(method => {
      identity.addVerificationMethod(method);
    });
  }

  // Update on blockchain if connected
  try {
    await identityService.updateIdentityOnChain(identity.id);
  } catch (error) {
    logger.warn('Failed to update identity on blockchain:', error);
  }

  res.json({
    success: true,
    identity: identity.export(),
    message: 'Identity updated successfully'
  });

  logger.info('Identity updated', { 
    identityId: identity.id,
    owner: req.user?.address 
  });
}));

/**
 * GET /api/identities/:id/credentials
 * Get all credentials for an identity
 */
router.get('/:id/credentials', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  const { type } = req.query;
  
  let credentials = identity.credentials;
  
  // Filter by type if specified
  if (type) {
    credentials = identity.getCredentialsByType(type as string);
  }

  res.json({
    success: true,
    credentials: credentials.map(cred => ({
      id: cred.id,
      type: cred.type,
      issuer: cred.issuer,
      issuanceDate: cred.issuanceDate,
      expirationDate: cred.expirationDate,
      credentialSubject: cred.credentialSubject,
      proof: cred.proof
    })),
    count: credentials.length
  });
}));

/**
 * POST /api/identities/:id/presentations
 * Create a verifiable presentation
 */
router.post('/:id/presentations', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  const { credentialIds, challenge, domain } = req.body;

  if (!credentialIds || !Array.isArray(credentialIds) || credentialIds.length === 0) {
    throw new BadRequestError('credentialIds array is required');
  }

  const presentation = await identity.createPresentation(
    credentialIds,
    challenge,
    domain
  );

  res.json({
    success: true,
    presentation,
    message: 'Verifiable presentation created successfully'
  });

  logger.info('Verifiable presentation created', {
    identityId: identity.id,
    credentialCount: credentialIds.length,
    presentationId: presentation.id
  });
}));

/**
 * GET /api/identities/:id/did-document
 * Get DID document for an identity
 */
router.get('/:id/did-document', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  res.json({
    success: true,
    didDocument: identity.didDocument
  });
}));

/**
 * POST /api/identities/:id/sign
 * Sign data with identity's private key
 */
router.post('/:id/sign', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  const { data } = req.body;

  if (!data) {
    throw new BadRequestError('Data to sign is required');
  }

  const signature = await identity.signData(JSON.stringify(data));

  res.json({
    success: true,
    signature,
    data,
    signer: identity.did
  });

  logger.info('Data signed', {
    identityId: identity.id,
    dataHash: CryptoUtils.hash(JSON.stringify(data))
  });
}));

/**
 * POST /api/identities/:id/verify-signature
 * Verify a signature against an identity
 */
router.post('/:id/verify-signature', asyncHandler(async (req, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  const { data, signature } = req.body;

  if (!data || !signature) {
    throw new BadRequestError('Data and signature are required');
  }

  const isValid = identity.verifySignature(JSON.stringify(data), signature);

  res.json({
    success: true,
    isValid,
    data,
    signature,
    verifier: identity.did
  });
}));

/**
 * DELETE /api/identities/:id
 * Deactivate an identity
 */
router.delete('/:id', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  identity.deactivate();

  res.json({
    success: true,
    message: 'Identity deactivated successfully',
    identity: {
      id: identity.id,
      did: identity.did,
      isActive: identity.metadata.isActive
    }
  });

  logger.info('Identity deactivated', {
    identityId: identity.id,
    owner: req.user?.address
  });
}));

/**
 * POST /api/identities/:id/reactivate
 * Reactivate a deactivated identity
 */
router.post('/:id/reactivate', checkIdentityOwnership, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const identityService: IdentityService = req.app.locals.identityService;
  const identity = identityService.getIdentity(req.params.id);

  if (!identity) {
    throw new NotFoundError('Identity not found');
  }

  identity.reactivate();

  res.json({
    success: true,
    message: 'Identity reactivated successfully',
    identity: {
      id: identity.id,
      did: identity.did,
      isActive: identity.metadata.isActive
    }
  });

  logger.info('Identity reactivated', {
    identityId: identity.id,
    owner: req.user?.address
  });
}));

export default router;