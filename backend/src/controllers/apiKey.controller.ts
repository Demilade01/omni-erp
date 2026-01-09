import { Request, Response, NextFunction } from 'express';
import { APIKey } from '../models/APIKey.model';
import { generateApiKey } from '../utils/apiKey';
import { AppError } from '../utils/appError';
import { logger } from '../config/logger';

/**
 * Create a new API key
 * @route POST /api/v1/api-keys
 * @access Private
 */
export const createApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { name, permissions, expiresInDays } = req.body;

    if (!name) {
      throw new AppError('API key name is required', 400);
    }

    // Generate API key
    const { key, hashedKey } = await generateApiKey();

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key document
    const apiKey = await APIKey.create({
      userId: req.user.userId,
      name,
      key, // This will be removed by toJSON transform
      hashedKey,
      permissions: permissions || ['read'],
      expiresAt,
    });

    logger.info(`API key created for user: ${req.user.email}, name: ${name}`);

    // Return the key only once during creation
    res.status(201).json({
      status: 'success',
      message: 'API key created successfully. Please save it securely as it will not be shown again.',
      data: {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key, // Only shown during creation
          permissions: apiKey.permissions,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all API keys for current user
 * @route GET /api/v1/api-keys
 * @access Private
 */
export const getApiKeys = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const apiKeys = await APIKey.find({
      userId: req.user.userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        apiKeys,
        count: apiKeys.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single API key
 * @route GET /api/v1/api-keys/:id
 * @access Private
 */
export const getApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const apiKey = await APIKey.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      isActive: true,
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        apiKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update API key (name and permissions only)
 * @route PUT /api/v1/api-keys/:id
 * @access Private
 */
export const updateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { name, permissions } = req.body;

    const apiKey = await APIKey.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      isActive: true,
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    // Update fields
    if (name) apiKey.name = name;
    if (permissions) apiKey.permissions = permissions;

    await apiKey.save();

    logger.info(`API key updated: ${apiKey.name} by user: ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'API key updated successfully',
      data: {
        apiKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke (soft delete) an API key
 * @route DELETE /api/v1/api-keys/:id
 * @access Private
 */
export const revokeApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const apiKey = await APIKey.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      isActive: true,
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    // Soft delete by setting isActive to false
    apiKey.isActive = false;
    await apiKey.save();

    logger.info(`API key revoked: ${apiKey.name} by user: ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'API key revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

