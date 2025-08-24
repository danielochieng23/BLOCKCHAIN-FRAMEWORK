import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    identityId?: string;
  };
}

/**
 * JWT token authentication middleware
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      logger.warn('Invalid token attempt', { token: token.substring(0, 10) + '...' });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (address: string, identityId?: string): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  return jwt.sign(
    { 
      address,
      identityId,
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

/**
 * Ethereum signature authentication middleware
 */
export const authenticateSignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { message, signature, address } = req.body;

    if (!message || !signature || !address) {
      return res.status(400).json({ 
        error: 'Missing required fields: message, signature, address' 
      });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      logger.warn('Signature verification failed', { 
        provided: address,
        recovered: recoveredAddress 
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if message is not too old (prevent replay attacks)
    const messageData = JSON.parse(message);
    const timestamp = messageData.timestamp;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - timestamp > fiveMinutes) {
      return res.status(401).json({ error: 'Message too old' });
    }

    req.user = { address };
    next();
  } catch (error) {
    logger.error('Signature authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Check if user owns the requested identity
 */
export const checkIdentityOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const identityService = req.app.locals.identityService;
  const identityId = req.params.id || req.body.identityId;
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const identity = identityService.getIdentity(identityId);
  
  if (!identity) {
    return res.status(404).json({ error: 'Identity not found' });
  }

  if (identity.metadata.owner.toLowerCase() !== req.user.address.toLowerCase()) {
    return res.status(403).json({ error: 'Not authorized to access this identity' });
  }

  next();
};

/**
 * Admin role check middleware
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',') || [];
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!adminAddresses.includes(req.user.address.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Rate limiting for sensitive operations
 */
export const createAuthLimiter = (windowMs: number, max: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const attempt = attempts.get(key);
    
    if (!attempt || now > attempt.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (attempt.count >= max) {
      return res.status(429).json({
        error: 'Too many attempts, please try again later',
        retryAfter: Math.ceil((attempt.resetTime - now) / 1000)
      });
    }
    
    attempt.count++;
    next();
  };
};

/**
 * Validate Ethereum address format
 */
export const validateAddress = (req: Request, res: Response, next: NextFunction) => {
  const address = req.body.address || req.params.address;
  
  if (address && !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address format' });
  }
  
  next();
};