import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { isDevelopment } from '../config/env';

// Custom Error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  stack?: string;
  errors?: any;
}

// Error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code: string | undefined;

  // Check if it's our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  // MongoDB duplicate key error
  if ((err as any).code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
    code = 'DUPLICATE_FIELD';
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    statusCode,
    code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Prepare response
  const response: ErrorResponse = {
    status: 'error',
    message,
    code,
  };

  // Include stack trace in development
  if (isDevelopment) {
    response.stack = err.stack;
  }

  // Send response
  res.status(statusCode).json(response);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

