/**
 * Mapping Routes
 * Integration mapping management endpoints
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as mappingController from '../controllers/mapping.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mappings
 *   description: Integration mapping management
 */

/**
 * @swagger
 * /api/v1/mappings:
 *   get:
 *     summary: Get all integration mappings
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, description, or entity names
 *       - in: query
 *         name: sourceConnectionId
 *         schema:
 *           type: string
 *         description: Filter by source connection
 *       - in: query
 *         name: targetConnectionId
 *         schema:
 *           type: string
 *         description: Filter by target connection
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of mappings
 */
router.get('/', authenticate, mappingController.getMappings);

/**
 * @swagger
 * /api/v1/mappings/{id}:
 *   get:
 *     summary: Get mapping by ID
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mapping details
 *       404:
 *         description: Mapping not found
 */
router.get('/:id', authenticate, mappingController.getMapping);

/**
 * @swagger
 * /api/v1/mappings:
 *   post:
 *     summary: Create new integration mapping
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sourceConnectionId
 *               - targetConnectionId
 *               - sourceEntity
 *               - targetEntity
 *               - fieldMappings
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sourceConnectionId:
 *                 type: string
 *               targetConnectionId:
 *                 type: string
 *               sourceEntity:
 *                 type: string
 *               targetEntity:
 *                 type: string
 *               fieldMappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - sourceField
 *                     - targetField
 *                   properties:
 *                     sourceField:
 *                       type: string
 *                     targetField:
 *                       type: string
 *                     transformation:
 *                       type: string
 *                     defaultValue:
 *                       type: any
 *                     required:
 *                       type: boolean
 *               transformationRules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     rule:
 *                       type: string
 *                     expression:
 *                       type: string
 *     responses:
 *       201:
 *         description: Mapping created
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, mappingController.createMapping);

/**
 * @swagger
 * /api/v1/mappings/{id}:
 *   put:
 *     summary: Update mapping
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *     responses:
 *       200:
 *         description: Mapping updated
 *       404:
 *         description: Mapping not found
 */
router.put('/:id', authenticate, mappingController.updateMapping);

/**
 * @swagger
 * /api/v1/mappings/{id}:
 *   delete:
 *     summary: Delete mapping
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mapping deleted
 *       404:
 *         description: Mapping not found
 */
router.delete('/:id', authenticate, mappingController.deleteMapping);

/**
 * @swagger
 * /api/v1/mappings/{id}/duplicate:
 *   post:
 *     summary: Duplicate mapping
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mapping duplicated
 *       404:
 *         description: Mapping not found
 */
router.post('/:id/duplicate', authenticate, mappingController.duplicateMapping);

/**
 * @swagger
 * /api/v1/mappings/{id}/validate:
 *   post:
 *     summary: Validate mapping configuration
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Validation results
 *       404:
 *         description: Mapping not found
 */
router.post('/:id/validate', authenticate, mappingController.validateMapping);

/**
 * @swagger
 * /api/v1/mappings/{id}/test:
 *   post:
 *     summary: Test mapping with sample data
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *               - sampleData
 *             properties:
 *               sampleData:
 *                 type: object
 *                 description: Sample source data to transform
 *     responses:
 *       200:
 *         description: Transformation result
 *       404:
 *         description: Mapping not found
 */
router.post('/:id/test', authenticate, mappingController.testMapping);

/**
 * @swagger
 * /api/v1/mappings/suggest:
 *   post:
 *     summary: Get AI-suggested field mappings
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceSchema
 *               - targetSchema
 *             properties:
 *               sourceSchema:
 *                 type: object
 *                 description: Source entity schema
 *               targetSchema:
 *                 type: object
 *                 description: Target entity schema
 *               context:
 *                 type: string
 *                 description: Additional context for AI
 *     responses:
 *       200:
 *         description: Suggested mappings
 */
router.post('/suggest', authenticate, mappingController.suggestMappings);

export default router;
