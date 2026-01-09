import { Router } from 'express';
import {
  createApiKey,
  getApiKeys,
  getApiKey,
  updateApiKey,
  revokeApiKey,
} from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: API key management endpoints
 */

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresInDays:
 *                 type: number
 *     responses:
 *       201:
 *         description: API key created successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, createApiKey);

/**
 * @swagger
 * /api-keys:
 *   get:
 *     summary: Get all API keys for current user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, getApiKeys);

/**
 * @swagger
 * /api-keys/{id}:
 *   get:
 *     summary: Get a single API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 *       404:
 *         description: API key not found
 */
router.get('/:id', authenticate, getApiKey);

/**
 * @swagger
 * /api-keys/{id}:
 *   put:
 *     summary: Update API key
 *     tags: [API Keys]
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
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: API key updated successfully
 *       404:
 *         description: API key not found
 */
router.put('/:id', authenticate, updateApiKey);

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *       404:
 *         description: API key not found
 */
router.delete('/:id', authenticate, revokeApiKey);

export default router;

