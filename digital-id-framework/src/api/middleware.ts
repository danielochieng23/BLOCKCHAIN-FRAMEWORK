import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        address: string;
        privateKey?: string;
      };
    }
  }
}

/**
 * Authentication middleware
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7);
    const secretKey = process.env.API_SECRET_KEY || 'default-secret-key';
    
    try {
      const decoded = jwt.verify(token, secretKey) as any;
      req.user = {
        address: decoded.address,
        privateKey: decoded.privateKey // Only for demo purposes
      };
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Signature verification middleware
 */
export const signatureMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const address = req.headers['x-address'] as string;

    if (!signature || !timestamp || !address) {
      res.status(401).json({
        success: false,
        error: 'Missing signature headers'
      });
      return;
    }

    // Check timestamp is within 5 minutes
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
      res.status(401).json({
        success: false,
        error: 'Request timestamp expired'
      });
      return;
    }

    // Verify signature
    const message = `${req.method}:${req.path}:${timestamp}:${JSON.stringify(req.body)}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
      return;
    }

    req.user = { address };
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Signature verification error'
    });
  }
};

/**
 * Request validation middleware factory
 */
export const validateRequest = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting middleware
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const now = Date.now();

    let requestData = requestCounts.get(identifier);

    if (!requestData || now > requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + windowMs
      };
      requestCounts.set(identifier, requestData);
    }

    requestData.count++;

    if (requestData.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
      });
      return;
    }

    next();
  };
};

/**
 * CORS configuration for specific routes
 */
export const configureCors = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature, X-Timestamp, X-Address');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  };
};

/**
 * Privacy compliance middleware
 */
export const privacyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add privacy headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Log data access for compliance
  if (req.method === 'GET' && req.path.includes('/identity/')) {
    console.log(`Data access: ${req.user?.address} accessed ${req.path} at ${new Date().toISOString()}`);
  }

  next();
};

/**
 * Error logging middleware
 */
export const errorLoggingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.address
  });

  next(err);
};