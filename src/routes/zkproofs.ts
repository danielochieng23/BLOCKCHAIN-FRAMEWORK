import { Router } from 'express';
import { AuthenticatedRequest, authenticateSignature } from '../middleware/auth';
import { asyncHandler, BadRequestError } from '../middleware/errorHandler';
import { ZKProofGenerator, CircuitDefinitions } from '../utils/zkProofs';
import { CryptoUtils } from '../utils/crypto';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/zkproofs/circuits
 * Get available ZK proof circuits
 */
router.get('/circuits', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    circuits: Object.values(CircuitDefinitions),
    count: Object.keys(CircuitDefinitions).length
  });
}));

/**
 * POST /api/zkproofs/generate
 * Generate a zero-knowledge proof
 */
router.post('/generate', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  const { proofType, inputs, nonce } = req.body;

  if (!proofType || !inputs) {
    throw new BadRequestError('proofType and inputs are required');
  }

  const proofNonce = nonce || CryptoUtils.generateNonce();
  let proof;

  try {
    switch (proofType) {
      case 'age_verification':
        const { birthYear, minimumAge } = inputs;
        if (!birthYear || !minimumAge) {
          throw new BadRequestError('birthYear and minimumAge are required for age verification');
        }
        proof = ZKProofGenerator.generateAgeProof(birthYear, minimumAge, proofNonce);
        break;

      case 'location_verification':
        const { latitude, longitude, allowedRegion } = inputs;
        if (!latitude || !longitude || !allowedRegion) {
          throw new BadRequestError('latitude, longitude, and allowedRegion are required for location verification');
        }
        proof = ZKProofGenerator.generateLocationProof(latitude, longitude, allowedRegion, proofNonce);
        break;

      case 'income_verification':
        const { actualIncome, minimumRequired } = inputs;
        if (actualIncome === undefined || minimumRequired === undefined) {
          throw new BadRequestError('actualIncome and minimumRequired are required for income verification');
        }
        proof = ZKProofGenerator.generateIncomeProof(actualIncome, minimumRequired, proofNonce);
        break;

      case 'membership_proof':
        const { memberSecret, memberSet } = inputs;
        if (!memberSecret || !memberSet) {
          throw new BadRequestError('memberSecret and memberSet are required for membership proof');
        }
        proof = ZKProofGenerator.generateMembershipProof(memberSecret, memberSet, proofNonce);
        break;

      case 'credential_ownership':
        const { credentialHash, ownerSecret } = inputs;
        if (!credentialHash || !ownerSecret) {
          throw new BadRequestError('credentialHash and ownerSecret are required for credential ownership proof');
        }
        proof = ZKProofGenerator.generateCredentialOwnershipProof(credentialHash, ownerSecret, proofNonce);
        break;

      case 'range_proof':
        const { value, minValue, maxValue } = inputs;
        if (value === undefined || minValue === undefined || maxValue === undefined) {
          throw new BadRequestError('value, minValue, and maxValue are required for range proof');
        }
        proof = ZKProofGenerator.generateRangeProof(value, minValue, maxValue, proofNonce);
        break;

      default:
        throw new BadRequestError(`Unsupported proof type: ${proofType}`);
    }

    const proofId = CryptoUtils.generateSecureRandomString();
    const proofHash = CryptoUtils.hash(JSON.stringify(proof));

    // Store proof metadata (in production, use a database)
    if (!req.app.locals.zkProofs) {
      req.app.locals.zkProofs = new Map();
    }

    const proofMetadata = {
      id: proofId,
      type: proofType,
      prover: address,
      proofHash,
      inputs: inputs, // In production, store only non-sensitive metadata
      nonce: proofNonce,
      generated: new Date(),
      verified: false
    };

    req.app.locals.zkProofs.set(proofId, proofMetadata);

    res.json({
      success: true,
      proof: {
        id: proofId,
        type: proofType,
        proof,
        proofHash,
        publicSignals: proof.publicSignals,
        generated: new Date()
      },
      message: 'Zero-knowledge proof generated successfully'
    });

    logger.info('ZK proof generated', {
      proofId,
      type: proofType,
      prover: address,
      proofHash
    });

  } catch (error) {
    logger.error('ZK proof generation failed:', error);
    throw new BadRequestError(`Failed to generate proof: ${error.message}`);
  }
}));

/**
 * POST /api/zkproofs/verify
 * Verify a zero-knowledge proof
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { proof, expectedPublicSignals, proofType } = req.body;

  if (!proof || !expectedPublicSignals) {
    throw new BadRequestError('proof and expectedPublicSignals are required');
  }

  try {
    const isValid = ZKProofGenerator.verifyProof(proof, expectedPublicSignals);
    const proofHash = CryptoUtils.hash(JSON.stringify(proof));

    // Check if proof was previously generated through our system
    const zkProofs = req.app.locals.zkProofs || new Map();
    let proofMetadata = null;

    for (const [id, metadata] of zkProofs.entries()) {
      if (metadata.proofHash === proofHash) {
        proofMetadata = metadata;
        metadata.verified = true;
        zkProofs.set(id, metadata);
        break;
      }
    }

    res.json({
      success: true,
      verification: {
        valid: isValid,
        proofHash,
        proofType: proofType || proofMetadata?.type,
        timestamp: new Date(),
        publicSignals: expectedPublicSignals,
        knownProof: !!proofMetadata
      }
    });

    logger.info('ZK proof verified', {
      proofHash,
      isValid,
      proofType: proofType || proofMetadata?.type,
      verifier: req.ip
    });

  } catch (error) {
    logger.error('ZK proof verification failed:', error);
    throw new BadRequestError(`Failed to verify proof: ${error.message}`);
  }
}));

/**
 * POST /api/zkproofs/batch-verify
 * Verify multiple zero-knowledge proofs
 */
router.post('/batch-verify', asyncHandler(async (req, res) => {
  const { proofs, expectedSignals, proofTypes } = req.body;

  if (!proofs || !Array.isArray(proofs) || !expectedSignals || !Array.isArray(expectedSignals)) {
    throw new BadRequestError('proofs and expectedSignals arrays are required');
  }

  if (proofs.length !== expectedSignals.length) {
    throw new BadRequestError('proofs and expectedSignals arrays must have the same length');
  }

  try {
    const results = ZKProofGenerator.batchVerifyProofs(proofs, expectedSignals);
    
    const verificationResults = results.map((isValid, index) => ({
      index,
      valid: isValid,
      proofHash: CryptoUtils.hash(JSON.stringify(proofs[index])),
      proofType: proofTypes?.[index] || 'unknown',
      publicSignals: expectedSignals[index]
    }));

    const validCount = results.filter(r => r).length;

    res.json({
      success: true,
      batchVerification: {
        results: verificationResults,
        summary: {
          total: proofs.length,
          valid: validCount,
          invalid: proofs.length - validCount,
          successRate: (validCount / proofs.length) * 100
        },
        timestamp: new Date()
      }
    });

    logger.info('Batch ZK proof verification', {
      total: proofs.length,
      valid: validCount,
      successRate: (validCount / proofs.length) * 100,
      verifier: req.ip
    });

  } catch (error) {
    logger.error('Batch ZK proof verification failed:', error);
    throw new BadRequestError(`Failed to verify proofs: ${error.message}`);
  }
}));

/**
 * POST /api/zkproofs/generate-challenge
 * Generate a challenge for proof request
 */
router.post('/generate-challenge', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { address } = req.user!;
  const { prover, context } = req.body;

  if (!prover) {
    throw new BadRequestError('prover address is required');
  }

  const nonce = CryptoUtils.generateNonce();
  const challenge = CryptoUtils.generateZKChallenge(prover, address, nonce);

  const challengeData = {
    challenge,
    verifier: address,
    prover,
    context: context || 'default',
    nonce,
    generated: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  };

  // Store challenge (in production, use a database)
  if (!req.app.locals.zkChallenges) {
    req.app.locals.zkChallenges = new Map();
  }
  req.app.locals.zkChallenges.set(challenge, challengeData);

  res.json({
    success: true,
    challenge: challengeData,
    message: 'Challenge generated successfully'
  });

  logger.info('ZK challenge generated', {
    challenge,
    verifier: address,
    prover,
    context
  });
}));

/**
 * GET /api/zkproofs/nullifier/:nullifier
 * Check if a nullifier has been used
 */
router.get('/nullifier/:nullifier', asyncHandler(async (req, res) => {
  const nullifier = req.params.nullifier;

  if (!nullifier) {
    throw new BadRequestError('nullifier is required');
  }

  // Check nullifier usage (in production, use a database)
  const usedNullifiers = req.app.locals.usedNullifiers || new Set();
  const isUsed = usedNullifiers.has(nullifier);

  res.json({
    success: true,
    nullifier,
    isUsed,
    checkedAt: new Date()
  });
}));

/**
 * POST /api/zkproofs/mark-nullifier
 * Mark a nullifier as used (for testing purposes)
 */
router.post('/mark-nullifier', authenticateSignature, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { nullifier } = req.body;

  if (!nullifier) {
    throw new BadRequestError('nullifier is required');
  }

  // Mark nullifier as used
  if (!req.app.locals.usedNullifiers) {
    req.app.locals.usedNullifiers = new Set();
  }
  req.app.locals.usedNullifiers.add(nullifier);

  res.json({
    success: true,
    nullifier,
    marked: true,
    timestamp: new Date()
  });

  logger.info('Nullifier marked as used', {
    nullifier,
    marker: req.user?.address
  });
}));

/**
 * GET /api/zkproofs/witness/:circuitType
 * Generate witness for a circuit type
 */
router.post('/witness/:circuitType', asyncHandler(async (req, res) => {
  const circuitType = req.params.circuitType;
  const { inputs } = req.body;

  if (!inputs) {
    throw new BadRequestError('inputs are required');
  }

  try {
    const witness = ZKProofGenerator.generateWitness(circuitType, inputs);

    res.json({
      success: true,
      witness,
      circuitType,
      generated: new Date()
    });

  } catch (error) {
    logger.error('Witness generation failed:', error);
    throw new BadRequestError(`Failed to generate witness: ${error.message}`);
  }
}));

/**
 * GET /api/zkproofs/statistics
 * Get ZK proof statistics
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const zkProofs = req.app.locals.zkProofs || new Map();
  const allProofs = Array.from(zkProofs.values());

  const stats = {
    total: allProofs.length,
    byType: {},
    verified: allProofs.filter(p => p.verified).length,
    generated: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  allProofs.forEach(proof => {
    // Count by type
    stats.byType[proof.type] = (stats.byType[proof.type] || 0) + 1;

    // Count by time period
    const generated = new Date(proof.generated);
    if (generated >= today) stats.generated.today++;
    if (generated >= weekAgo) stats.generated.thisWeek++;
    if (generated >= monthAgo) stats.generated.thisMonth++;
  });

  res.json({
    success: true,
    statistics: stats,
    availableCircuits: Object.keys(CircuitDefinitions).length
  });
}));

export default router;