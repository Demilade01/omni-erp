import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User.model';
import { APIKey } from '../models/APIKey.model';
import { comparePassword } from '../utils/password';
import { AppError } from '../utils/appError';
import { UserRole } from '../types';
import { logger } from '../config/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please authenticate.', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError('User no longer exists or is inactive', 401);
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Authentication error:', error);
      next(new AppError('Invalid or expired token', 401));
    }
  }
};

/**
 * Middleware to authenticate using API Key
 */
export const authenticateApiKey = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AppError('No API key provided', 401);
    }

    // Find API key in database
    const apiKeyDoc = await APIKey.findOne({ isActive: true })
      .select('+key')
      .populate('userId');

    if (!apiKeyDoc) {
      throw new AppError('Invalid API key', 401);
    }

    // Compare the provided key with stored hashed key
    const isValid = await comparePassword(apiKey, apiKeyDoc.hashedKey);

    if (!isValid) {
      throw new AppError('Invalid API key', 401);
    }

    // Check if API key has expired
    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      throw new AppError('API key has expired', 401);
    }

    // Update last used timestamp and usage count
    apiKeyDoc.lastUsedAt = new Date();
    apiKeyDoc.usageCount += 1;
    await apiKeyDoc.save();

    // Get user from API key
    const user = await User.findById(apiKeyDoc.userId);

    if (!user || !user.isActive) {
      throw new AppError('User associated with API key is inactive', 401);
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('API key authentication error:', error);
      next(new AppError('Invalid API key', 401));
    }
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param roles - Array of allowed roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

