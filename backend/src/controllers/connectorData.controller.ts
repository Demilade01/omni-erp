/**
 * Connector Data Controller
 * API endpoints for executing requests through connectors
 */

import { Request, Response, NextFunction } from 'express';
import { connectorService } from '../services/connector.service';
import { RESTConnector, ODataConnector } from '../connectors';
import { ODataQueryOptions } from '../connectors/odata/types';
import { logger } from '../config/logger';
import { createValidationError } from '../utils/appError';

// ==========================================
// REST CONNECTOR ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/v1/connectors/{id}/rest/get:
 *   post:
 *     summary: Execute GET request through REST connector
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *                 description: API endpoint path
 *               queryParams:
 *                 type: object
 *                 description: Query parameters
 *     responses:
 *       200:
 *         description: Response from external API
 */
export const restGet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { path, queryParams } = req.body;
    const userId = req.user!.userId;

    if (!path) {
      throw createValidationError('Path is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof RESTConnector)) {
      throw createValidationError('This endpoint is only for REST connectors');
    }

    logger.info(`[REST] GET ${path} via connector ${id}`);

    const result = await connector.getData(path, queryParams);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/rest/post:
 *   post:
 *     summary: Execute POST request through REST connector
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *               data:
 *                 type: object
 *               queryParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Response from external API
 */
export const restPost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { path, data, queryParams } = req.body;
    const userId = req.user!.userId;

    if (!path) {
      throw createValidationError('Path is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof RESTConnector)) {
      throw createValidationError('This endpoint is only for REST connectors');
    }

    logger.info(`[REST] POST ${path} via connector ${id}`);

    const result = await connector.createData(path, data, queryParams);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/rest/put:
 *   post:
 *     summary: Execute PUT request through REST connector
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *               - data
 *             properties:
 *               path:
 *                 type: string
 *               data:
 *                 type: object
 *               queryParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Response from external API
 */
export const restPut = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { path, data, queryParams } = req.body;
    const userId = req.user!.userId;

    if (!path || !data) {
      throw createValidationError('Path and data are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof RESTConnector)) {
      throw createValidationError('This endpoint is only for REST connectors');
    }

    logger.info(`[REST] PUT ${path} via connector ${id}`);

    const result = await connector.updateData(path, data, queryParams);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/rest/patch:
 *   post:
 *     summary: Execute PATCH request through REST connector
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *               - data
 *             properties:
 *               path:
 *                 type: string
 *               data:
 *                 type: object
 *               queryParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Response from external API
 */
export const restPatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { path, data, queryParams } = req.body;
    const userId = req.user!.userId;

    if (!path || !data) {
      throw createValidationError('Path and data are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof RESTConnector)) {
      throw createValidationError('This endpoint is only for REST connectors');
    }

    logger.info(`[REST] PATCH ${path} via connector ${id}`);

    const result = await connector.patchData(path, data, queryParams);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/rest/delete:
 *   post:
 *     summary: Execute DELETE request through REST connector
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *               queryParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Response from external API
 */
export const restDelete = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { path, queryParams } = req.body;
    const userId = req.user!.userId;

    if (!path) {
      throw createValidationError('Path is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof RESTConnector)) {
      throw createValidationError('This endpoint is only for REST connectors');
    }

    logger.info(`[REST] DELETE ${path} via connector ${id}`);

    await connector.deleteData(path, queryParams);

    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ODATA CONNECTOR ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/query:
 *   post:
 *     summary: Query OData entity set
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *             properties:
 *               entitySet:
 *                 type: string
 *                 description: OData entity set name
 *               $select:
 *                 type: array
 *                 items:
 *                   type: string
 *               $filter:
 *                 type: string
 *               $expand:
 *                 type: string
 *               $orderby:
 *                 type: string
 *               $top:
 *                 type: number
 *               $skip:
 *                 type: number
 *               $count:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: OData query results
 */
export const odataQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, ...queryOptions } = req.body;
    const userId = req.user!.userId;

    if (!entitySet) {
      throw createValidationError('entitySet is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Query ${entitySet} via connector ${id}`);

    const result = await connector.query(entitySet, queryOptions as ODataQueryOptions);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/entity:
 *   post:
 *     summary: Get single OData entity by key
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *               - key
 *             properties:
 *               entitySet:
 *                 type: string
 *               key:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: object
 *               $select:
 *                 type: array
 *                 items:
 *                   type: string
 *               $expand:
 *                 type: string
 *     responses:
 *       200:
 *         description: OData entity
 */
export const odataGetEntity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, key, ...queryOptions } = req.body;
    const userId = req.user!.userId;

    if (!entitySet || key === undefined) {
      throw createValidationError('entitySet and key are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Get entity ${entitySet}(${key}) via connector ${id}`);

    const result = await connector.getEntity(entitySet, key, queryOptions as ODataQueryOptions);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/create:
 *   post:
 *     summary: Create OData entity
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *               - data
 *             properties:
 *               entitySet:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Created entity
 */
export const odataCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, data } = req.body;
    const userId = req.user!.userId;

    if (!entitySet || !data) {
      throw createValidationError('entitySet and data are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Create entity in ${entitySet} via connector ${id}`);

    const result = await connector.createEntity(entitySet, data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/update:
 *   post:
 *     summary: Update OData entity (full replace)
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *               - key
 *               - data
 *             properties:
 *               entitySet:
 *                 type: string
 *               key:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: object
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated entity
 */
export const odataUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, key, data } = req.body;
    const userId = req.user!.userId;

    if (!entitySet || key === undefined || !data) {
      throw createValidationError('entitySet, key, and data are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Update entity ${entitySet}(${key}) via connector ${id}`);

    const result = await connector.updateEntity(entitySet, key, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/patch:
 *   post:
 *     summary: Patch OData entity (partial update)
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *               - key
 *               - data
 *             properties:
 *               entitySet:
 *                 type: string
 *               key:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: object
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Patched entity
 */
export const odataPatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, key, data } = req.body;
    const userId = req.user!.userId;

    if (!entitySet || key === undefined || !data) {
      throw createValidationError('entitySet, key, and data are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Patch entity ${entitySet}(${key}) via connector ${id}`);

    const result = await connector.patchEntity(entitySet, key, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/delete:
 *   post:
 *     summary: Delete OData entity
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *               - key
 *             properties:
 *               entitySet:
 *                 type: string
 *               key:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: object
 *     responses:
 *       200:
 *         description: Entity deleted
 */
export const odataDelete = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, key } = req.body;
    const userId = req.user!.userId;

    if (!entitySet || key === undefined) {
      throw createValidationError('entitySet and key are required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Delete entity ${entitySet}(${key}) via connector ${id}`);

    await connector.deleteEntity(entitySet, key);

    res.json({
      success: true,
      message: 'Entity deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/count:
 *   post:
 *     summary: Count OData entities
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *             properties:
 *               entitySet:
 *                 type: string
 *               $filter:
 *                 type: string
 *     responses:
 *       200:
 *         description: Entity count
 */
export const odataCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, $filter } = req.body;
    const userId = req.user!.userId;

    if (!entitySet) {
      throw createValidationError('entitySet is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Count ${entitySet} via connector ${id}`);

    const count = await connector.count(entitySet, $filter);

    res.json({
      success: true,
      data: {
        count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/function:
 *   post:
 *     summary: Call OData function
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - functionName
 *             properties:
 *               functionName:
 *                 type: string
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Function result
 */
export const odataCallFunction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { functionName, parameters } = req.body;
    const userId = req.user!.userId;

    if (!functionName) {
      throw createValidationError('functionName is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Call function ${functionName} via connector ${id}`);

    const result = await connector.callFunction(functionName, { parameters });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/action:
 *   post:
 *     summary: Call OData action
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actionName
 *             properties:
 *               actionName:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Action result
 */
export const odataCallAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { actionName, data } = req.body;
    const userId = req.user!.userId;

    if (!actionName) {
      throw createValidationError('actionName is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Call action ${actionName} via connector ${id}`);

    const result = await connector.callAction(actionName, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/batch:
 *   post:
 *     summary: Execute OData batch request
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requests
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                       enum: [GET, POST, PUT, PATCH, DELETE]
 *                     url:
 *                       type: string
 *                     body:
 *                       type: object
 *     responses:
 *       200:
 *         description: Batch results
 */
export const odataBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { requests } = req.body;
    const userId = req.user!.userId;

    if (!requests || !Array.isArray(requests)) {
      throw createValidationError('requests array is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Batch request with ${requests.length} operations via connector ${id}`);

    const results = await connector.batch(requests);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/connectors/{id}/odata/all:
 *   post:
 *     summary: Get all entities with automatic pagination
 *     tags: [Connector Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitySet
 *             properties:
 *               entitySet:
 *                 type: string
 *               $select:
 *                 type: array
 *                 items:
 *                   type: string
 *               $filter:
 *                 type: string
 *               $orderby:
 *                 type: string
 *     responses:
 *       200:
 *         description: All entities
 */
export const odataGetAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { entitySet, ...queryOptions } = req.body;
    const userId = req.user!.userId;

    if (!entitySet) {
      throw createValidationError('entitySet is required');
    }

    const connector = await connectorService.getConnector(id, userId);

    if (!(connector instanceof ODataConnector)) {
      throw createValidationError('This endpoint is only for OData connectors');
    }

    logger.info(`[OData] Get all ${entitySet} via connector ${id}`);

    const results = await connector.getAll(entitySet, queryOptions as ODataQueryOptions);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    next(error);
  }
};

