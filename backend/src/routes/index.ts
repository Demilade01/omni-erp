import { Router } from 'express';
import authRoutes from './auth.routes';
import apiKeyRoutes from './apiKey.routes';

const router = Router();

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: API v1 information
 *     tags: [Health]
 *     description: Returns information about API version 1
 *     responses:
 *       200:
 *         description: API version information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 version:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'success',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      erp: '/api/v1/erp',
      workflows: '/api/v1/workflows',
      ai: '/api/v1/ai',
      mappings: '/api/v1/mappings',
      mcp: '/api/v1/mcp',
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/api-keys', apiKeyRoutes);

// Additional routes will be added here as they are created
// import userRoutes from './user.routes';
// import erpRoutes from './erp.routes';
// router.use('/users', userRoutes);
// router.use('/erp', erpRoutes);

export default router;

