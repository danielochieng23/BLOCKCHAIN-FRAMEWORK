import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === '11000') {
    statusCode = 409;
    message = 'Resource already exists';
  }

  // Don't leak error details in production
  const response: any = {
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes
 */
export class BadRequestError extends Error {
  statusCode = 400;
  
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  
  constructor(message: string = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends Error {
  statusCode = 500;
  
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
  }
}