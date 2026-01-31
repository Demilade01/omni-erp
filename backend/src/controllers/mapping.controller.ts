/**
 * Mapping Controller
 * Handles integration mapping operations
 */

import { Request, Response, NextFunction } from 'express';
import { IntegrationMapping, ERPConnection } from '../models';
import { createNotFoundError, createValidationError } from '../utils/appError';
import { logger } from '../config/logger';
import { aiService } from '../ai';

/**
 * Get all mappings for user
 */
export const getMappings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      page = 1,
      limit = 10,
      search,
      sourceConnectionId,
      targetConnectionId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query: any = { userId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sourceEntity: { $regex: search, $options: 'i' } },
        { targetEntity: { $regex: search, $options: 'i' } },
      ];
    }

    if (sourceConnectionId) {
      query.sourceConnectionId = sourceConnectionId;
    }

    if (targetConnectionId) {
      query.targetConnectionId = targetConnectionId;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const [mappings, total] = await Promise.all([
      IntegrationMapping.find(query)
        .populate('sourceConnectionId', 'name type')
        .populate('targetConnectionId', 'name type')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      IntegrationMapping.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        mappings,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get mapping by ID
 */
export const getMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mapping = await IntegrationMapping.findOne({ _id: id, userId, isActive: true })
      .populate('sourceConnectionId', 'name type baseUrl')
      .populate('targetConnectionId', 'name type baseUrl');

    if (!mapping) {
      throw createNotFoundError('Mapping not found');
    }

    res.status(200).json({
      status: 'success',
      data: { mapping },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new mapping
 */
export const createMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      name,
      description,
      sourceConnectionId,
      targetConnectionId,
      sourceEntity,
      targetEntity,
      fieldMappings,
      transformationRules
    } = req.body;

    // Validate connections exist and belong to user
    const [sourceConnection, targetConnection] = await Promise.all([
      ERPConnection.findOne({ _id: sourceConnectionId, userId, isActive: true }),
      ERPConnection.findOne({ _id: targetConnectionId, userId, isActive: true }),
    ]);

    if (!sourceConnection) {
      throw createValidationError('Source connection not found');
    }

    if (!targetConnection) {
      throw createValidationError('Target connection not found');
    }

    // Validate field mappings
    if (!fieldMappings || !Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      throw createValidationError('At least one field mapping is required');
    }

    const mapping = await IntegrationMapping.create({
      userId,
      name,
      description,
      sourceConnectionId,
      targetConnectionId,
      sourceEntity,
      targetEntity,
      fieldMappings,
      transformationRules: transformationRules || [],
    });

    logger.info(`Mapping created: ${mapping._id} by user ${userId}`);

    res.status(201).json({
      status: 'success',
      message: 'Mapping created successfully',
      data: { mapping },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update mapping
 */
export const updateMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const {
      name,
      description,
      sourceConnectionId,
      targetConnectionId,
      sourceEntity,
      targetEntity,
      fieldMappings,
      transformationRules
    } = req.body;

    const mapping = await IntegrationMapping.findOne({ _id: id, userId, isActive: true });

    if (!mapping) {
      throw createNotFoundError('Mapping not found');
    }

    // Validate connections if changing
    if (sourceConnectionId && sourceConnectionId !== mapping.sourceConnectionId.toString()) {
      const sourceConnection = await ERPConnection.findOne({
        _id: sourceConnectionId,
        userId,
        isActive: true
      });
      if (!sourceConnection) {
        throw createValidationError('Source connection not found');
      }
      mapping.sourceConnectionId = sourceConnectionId;
    }

    if (targetConnectionId && targetConnectionId !== mapping.targetConnectionId.toString()) {
      const targetConnection = await ERPConnection.findOne({
        _id: targetConnectionId,
        userId,
        isActive: true
      });
      if (!targetConnection) {
        throw createValidationError('Target connection not found');
      }
      mapping.targetConnectionId = targetConnectionId;
    }

    // Update fields
    if (name !== undefined) mapping.name = name;
    if (description !== undefined) mapping.description = description;
    if (sourceEntity !== undefined) mapping.sourceEntity = sourceEntity;
    if (targetEntity !== undefined) mapping.targetEntity = targetEntity;
    if (fieldMappings !== undefined) mapping.fieldMappings = fieldMappings;
    if (transformationRules !== undefined) mapping.transformationRules = transformationRules;

    await mapping.save();

    logger.info(`Mapping updated: ${id} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Mapping updated successfully',
      data: { mapping },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete mapping (soft delete)
 */
export const deleteMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mapping = await IntegrationMapping.findOne({ _id: id, userId, isActive: true });

    if (!mapping) {
      throw createNotFoundError('Mapping not found');
    }

    mapping.isActive = false;
    await mapping.save();

    logger.info(`Mapping deleted: ${id} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Mapping deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate mapping
 */
export const duplicateMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name } = req.body;

    const sourceMapping = await IntegrationMapping.findOne({ _id: id, userId, isActive: true });

    if (!sourceMapping) {
      throw createNotFoundError('Mapping not found');
    }

    const newMapping = await IntegrationMapping.create({
      userId,
      name: name || `${sourceMapping.name} (Copy)`,
      description: sourceMapping.description,
      sourceConnectionId: sourceMapping.sourceConnectionId,
      targetConnectionId: sourceMapping.targetConnectionId,
      sourceEntity: sourceMapping.sourceEntity,
      targetEntity: sourceMapping.targetEntity,
      fieldMappings: sourceMapping.fieldMappings,
      transformationRules: sourceMapping.transformationRules,
    });

    logger.info(`Mapping duplicated: ${id} -> ${newMapping._id}`);

    res.status(201).json({
      status: 'success',
      message: 'Mapping duplicated successfully',
      data: { mapping: newMapping },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI-suggested field mappings
 */
export const suggestMappings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceSchema, targetSchema, context } = req.body;

    if (!sourceSchema || !targetSchema) {
      throw createValidationError('Source and target schemas are required');
    }

    logger.info('Generating AI field mapping suggestions');

    const suggestions = await aiService.suggestFieldMappings(
      sourceSchema,
      targetSchema,
      context
    );

    res.status(200).json({
      status: 'success',
      data: { suggestions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate mapping configuration
 */
export const validateMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mapping = await IntegrationMapping.findOne({ _id: id, userId, isActive: true })
      .populate('sourceConnectionId')
      .populate('targetConnectionId');

    if (!mapping) {
      throw createNotFoundError('Mapping not found');
    }

    const validationResults = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Check connections are active
    const sourceConn = mapping.sourceConnectionId as any;
    const targetConn = mapping.targetConnectionId as any;

    if (sourceConn.status !== 'active') {
      validationResults.warnings.push('Source connection is not active');
    }

    if (targetConn.status !== 'active') {
      validationResults.warnings.push('Target connection is not active');
    }

    // Check required fields have mappings
    const requiredMappings = mapping.fieldMappings.filter(m => m.required);
    for (const fieldMapping of requiredMappings) {
      if (!fieldMapping.sourceField) {
        validationResults.errors.push(
          `Required field "${fieldMapping.targetField}" has no source mapping`
        );
        validationResults.isValid = false;
      }
    }

    // Check for duplicate target fields
    const targetFields = mapping.fieldMappings.map(m => m.targetField);
    const duplicates = targetFields.filter(
      (field, index) => targetFields.indexOf(field) !== index
    );
    if (duplicates.length > 0) {
      validationResults.errors.push(
        `Duplicate target fields: ${[...new Set(duplicates)].join(', ')}`
      );
      validationResults.isValid = false;
    }

    res.status(200).json({
      status: 'success',
      data: { validation: validationResults },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test mapping with sample data
 */
export const testMapping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { sampleData } = req.body;

    const mapping = await IntegrationMapping.findOne({ _id: id, userId, isActive: true });

    if (!mapping) {
      throw createNotFoundError('Mapping not found');
    }

    if (!sampleData) {
      throw createValidationError('Sample data is required');
    }

    // Apply field mappings to sample data
    const transformedData: any = {};

    for (const fieldMapping of mapping.fieldMappings) {
      let value = getNestedValue(sampleData, fieldMapping.sourceField);

      // Apply transformation if defined
      if (fieldMapping.transformation && value !== undefined) {
        try {
          value = applyTransformation(value, fieldMapping.transformation);
        } catch (error) {
          transformedData[`_error_${fieldMapping.targetField}`] =
            `Transformation error: ${error instanceof Error ? error.message : String(error)}`;
          continue;
        }
      }

      // Use default value if source is undefined
      if (value === undefined && fieldMapping.defaultValue !== undefined) {
        value = fieldMapping.defaultValue;
      }

      setNestedValue(transformedData, fieldMapping.targetField, value);
    }

    res.status(200).json({
      status: 'success',
      data: {
        input: sampleData,
        output: transformedData,
        mappingsApplied: mapping.fieldMappings.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get nested value from object by dot notation
 */
function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Set nested value in object by dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  const last = parts.pop()!;
  let current = obj;

  for (const part of parts) {
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[last] = value;
}

/**
 * Apply transformation to value
 */
function applyTransformation(value: any, transformation: string): any {
  switch (transformation) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    case 'toString':
      return String(value);
    case 'toNumber':
      return Number(value);
    case 'toBoolean':
      return Boolean(value);
    case 'toDate':
      return new Date(value).toISOString();
    case 'toArray':
      return Array.isArray(value) ? value : [value];
    case 'stringify':
      return JSON.stringify(value);
    case 'parse':
      return JSON.parse(value);
    default:
      // Check if it's a custom expression
      if (transformation.startsWith('expr:')) {
        const expr = transformation.slice(5);
        const fn = new Function('value', `return ${expr}`);
        return fn(value);
      }
      return value;
  }
}
