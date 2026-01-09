/**
 * Custom Application Error class for handling errors consistently
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a validation error
 */
export const createValidationError = (message: string): AppError => {
  return new AppError(message, 400);
};

/**
 * Create an unauthorized error
 */
export const createUnauthorizedError = (message: string = 'Unauthorized'): AppError => {
  return new AppError(message, 401);
};

/**
 * Create a forbidden error
 */
export const createForbiddenError = (message: string = 'Forbidden'): AppError => {
  return new AppError(message, 403);
};

/**
 * Create a not found error
 */
export const createNotFoundError = (message: string = 'Resource not found'): AppError => {
  return new AppError(message, 404);
};

/**
 * Create a conflict error
 */
export const createConflictError = (message: string): AppError => {
  return new AppError(message, 409);
};

/**
 * Create an internal server error
 */
export const createInternalError = (message: string = 'Internal server error'): AppError => {
  return new AppError(message, 500);
};

