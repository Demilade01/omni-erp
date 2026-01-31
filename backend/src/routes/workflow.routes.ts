/**
 * Workflow Routes
 * Workflow management endpoints
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as workflowController from '../controllers/workflow.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Workflows
 *   description: Workflow management and execution
 */

/**
 * @swagger
 * /api/v1/workflows:
 *   get:
 *     summary: Get all workflows
 *     tags: [Workflows]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, paused, archived, completed, failed]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of workflows
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
 *                     workflows:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Workflow'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', authenticate, workflowController.getWorkflows);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   get:
 *     summary: Get workflow by ID
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow details
 *       404:
 *         description: Workflow not found
 */
router.get('/:id', authenticate, workflowController.getWorkflow);

/**
 * @swagger
 * /api/v1/workflows:
 *   post:
 *     summary: Create new workflow
 *     tags: [Workflows]
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
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *                 description: Workflow name
 *               description:
 *                 type: string
 *                 description: Workflow description
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - name
 *                     - config
 *                   properties:
 *                     id:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [trigger, connector, transform, condition, action]
 *                     name:
 *                       type: string
 *                     config:
 *                       type: object
 *                     nextSteps:
 *                       type: array
 *                       items:
 *                         type: string
 *               schedule:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   cronExpression:
 *                     type: string
 *                   timezone:
 *                     type: string
 *     responses:
 *       201:
 *         description: Workflow created
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, workflowController.createWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   put:
 *     summary: Update workflow
 *     tags: [Workflows]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               steps:
 *                 type: array
 *               schedule:
 *                 type: object
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workflow updated
 *       404:
 *         description: Workflow not found
 */
router.put('/:id', authenticate, workflowController.updateWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   delete:
 *     summary: Delete workflow
 *     tags: [Workflows]
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
 *         description: Workflow deleted
 *       404:
 *         description: Workflow not found
 */
router.delete('/:id', authenticate, workflowController.deleteWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}/activate:
 *   post:
 *     summary: Activate workflow
 *     tags: [Workflows]
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
 *         description: Workflow activated
 *       400:
 *         description: Workflow already active
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/activate', authenticate, workflowController.activateWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}/pause:
 *   post:
 *     summary: Pause workflow
 *     tags: [Workflows]
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
 *         description: Workflow paused
 *       400:
 *         description: Workflow not active
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/pause', authenticate, workflowController.pauseWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}/execute:
 *   post:
 *     summary: Execute workflow manually
 *     tags: [Workflows]
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
 *               input:
 *                 type: object
 *                 description: Input data for workflow execution
 *     responses:
 *       202:
 *         description: Execution started
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
 *                     executionId:
 *                       type: string
 *                     workflowId:
 *                       type: string
 *                     status:
 *                       type: string
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/execute', authenticate, workflowController.executeWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}/duplicate:
 *   post:
 *     summary: Duplicate workflow
 *     tags: [Workflows]
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
 *                 description: Name for the duplicated workflow
 *     responses:
 *       201:
 *         description: Workflow duplicated
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/duplicate', authenticate, workflowController.duplicateWorkflow);

/**
 * @swagger
 * /api/v1/workflows/{id}/schedule:
 *   put:
 *     summary: Update workflow schedule
 *     tags: [Workflows]
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
 *             properties:
 *               enabled:
 *                 type: boolean
 *               cronExpression:
 *                 type: string
 *                 description: Cron expression (e.g., "0 9 * * *")
 *               timezone:
 *                 type: string
 *                 description: Timezone (e.g., "UTC", "America/New_York")
 *     responses:
 *       200:
 *         description: Schedule updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Workflow not found
 */
router.put('/:id/schedule', authenticate, workflowController.updateSchedule);

/**
 * @swagger
 * /api/v1/workflows/{id}/executions:
 *   get:
 *     summary: Get workflow execution history
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Execution history
 *       404:
 *         description: Workflow not found
 */
router.get('/:id/executions', authenticate, workflowController.getExecutionHistory);

/**
 * @swagger
 * /api/v1/workflows/{id}/executions/{executionId}:
 *   get:
 *     summary: Get specific execution details
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Execution details
 *       404:
 *         description: Execution not found
 */
router.get('/:id/executions/:executionId', authenticate, workflowController.getExecution);

/**
 * @swagger
 * /api/v1/workflows/{id}/executions/{executionId}/cancel:
 *   post:
 *     summary: Cancel running execution
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Execution cancelled
 *       400:
 *         description: Execution not running
 *       404:
 *         description: Execution not found
 */
router.post('/:id/executions/:executionId/cancel', authenticate, workflowController.cancelExecution);

export default router;
