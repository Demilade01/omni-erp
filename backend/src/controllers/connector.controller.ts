/**
 * Connector Controller
 * Handles ERP connector operations
 */

import { Request, Response, NextFunction } from 'express';
import { connectorService } from '../services/connector.service';
import { ERPConnection } from '../models';
import { createNotFoundError } from '../utils/appError';
import { logger } from '../config/logger';

/**
 * Test connection
 */
export const testConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    logger.info(`Testing connection ${id} for user ${userId}`);

    const result = await connectorService.testConnection(id, userId);

    res.status(200).json({
      status: 'success',
      message: 'Connection test completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Connect to ERP system
 */
export const connectToERP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    logger.info(`Connecting to ERP ${id} for user ${userId}`);

    await connectorService.connect(id, userId);

    res.status(200).json({
      status: 'success',
      message: 'Connected to ERP system successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnect from ERP system
 */
export const disconnectFromERP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    logger.info(`Disconnecting from ERP ${id}`);

    await connectorService.disconnect(id);

    res.status(200).json({
      status: 'success',
      message: 'Disconnected from ERP system successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get connector status
 */
export const getConnectorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const status = await connectorService.getStatus(id, userId);

    res.status(200).json({
      status: 'success',
      data: { status },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get connector metrics
 */
export const getConnectorMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const metrics = await connectorService.getMetrics(id, userId);

    res.status(200).json({
      status: 'success',
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all ERP connections for user
 */
export const getERPConnections = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 10, search, erpType, status } = req.query;

    // Build query
    const query: any = { userId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (erpType) {
      query.type = erpType;
    }

    if (status) {
      query.status = status;
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const [connections, total] = await Promise.all([
      ERPConnection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ERPConnection.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        connections,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single ERP connection
 */
export const getERPConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const connection = await ERPConnection.findOne({
      _id: id,
      userId,
    });

    if (!connection) {
      throw createNotFoundError('ERP connection not found');
    }

    res.status(200).json({
      status: 'success',
      data: { connection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create ERP connection
 */
export const createERPConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const connectionData = req.body;

    const connection = await ERPConnection.create({
      ...connectionData,
      userId,
    });

    logger.info(`ERP connection created: ${connection._id}`);

    res.status(201).json({
      status: 'success',
      message: 'ERP connection created successfully',
      data: { connection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ERP connection
 */
export const updateERPConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const updates = req.body;

    const connection = await ERPConnection.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!connection) {
      throw createNotFoundError('ERP connection not found');
    }

    // Disconnect old connector if exists
    await connectorService.removeConnector(id);

    logger.info(`ERP connection updated: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'ERP connection updated successfully',
      data: { connection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete ERP connection
 */
export const deleteERPConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const connection = await ERPConnection.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!connection) {
      throw createNotFoundError('ERP connection not found');
    }

    // Disconnect and remove connector
    await connectorService.removeConnector(id);

    logger.info(`ERP connection deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'ERP connection deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

