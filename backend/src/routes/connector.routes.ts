/**
 * Connector Routes
 * ERP connector management endpoints
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as connectorController from '../controllers/connector.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Connectors
 *   description: ERP connector management
 */

/**
 * @swagger
 * /api/v1/connectors:
 *   get:
 *     summary: Get all ERP connections
 *     tags: [Connectors]
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
 *         description: Search by name or description
 *       - in: query
 *         name: erpType
 *         schema:
 *           type: string
 *         description: Filter by ERP type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of ERP connections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     connections:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ERPConnection'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/', authenticate, connectorController.getERPConnections);

/**
 * @swagger
 * /api/v1/connectors/{id}:
 *   get:
 *     summary: Get ERP connection by ID
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: ERP connection details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     connection:
 *                       $ref: '#/components/schemas/ERPConnection'
 *       404:
 *         description: Connection not found
 */
router.get('/:id', authenticate, connectorController.getERPConnection);

/**
 * @swagger
 * /api/v1/connectors:
 *   post:
 *     summary: Create new ERP connection
 *     tags: [Connectors]
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
 *               - erpType
 *               - authType
 *               - baseUrl
 *               - credentials
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               erpType:
 *                 type: string
 *               authType:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               credentials:
 *                 type: object
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: ERP connection created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     connection:
 *                       $ref: '#/components/schemas/ERPConnection'
 */
router.post('/', authenticate, connectorController.createERPConnection);

/**
 * @swagger
 * /api/v1/connectors/{id}:
 *   put:
 *     summary: Update ERP connection
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               credentials:
 *                 type: object
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: ERP connection updated
 *       404:
 *         description: Connection not found
 */
router.put('/:id', authenticate, connectorController.updateERPConnection);

/**
 * @swagger
 * /api/v1/connectors/{id}:
 *   delete:
 *     summary: Delete ERP connection
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: ERP connection deleted
 *       404:
 *         description: Connection not found
 */
router.delete('/:id', authenticate, connectorController.deleteERPConnection);

/**
 * @swagger
 * /api/v1/connectors/{id}/test:
 *   post:
 *     summary: Test ERP connection
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.post('/:id/test', authenticate, connectorController.testConnection);

/**
 * @swagger
 * /api/v1/connectors/{id}/connect:
 *   post:
 *     summary: Connect to ERP system
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Successfully connected
 */
router.post('/:id/connect', authenticate, connectorController.connectToERP);

/**
 * @swagger
 * /api/v1/connectors/{id}/disconnect:
 *   post:
 *     summary: Disconnect from ERP system
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Successfully disconnected
 */
router.post('/:id/disconnect', authenticate, connectorController.disconnectFromERP);

/**
 * @swagger
 * /api/v1/connectors/{id}/status:
 *   get:
 *     summary: Get connector status
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Connector status
 */
router.get('/:id/status', authenticate, connectorController.getConnectorStatus);

/**
 * @swagger
 * /api/v1/connectors/{id}/metrics:
 *   get:
 *     summary: Get connector metrics
 *     tags: [Connectors]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Connector metrics
 */
router.get('/:id/metrics', authenticate, connectorController.getConnectorMetrics);

export default router;

