import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env, isDevelopment } from './config/env';
import { morganStream } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';
import apiRoutes from './routes';

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Omni ERP API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Omni ERP API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Swagger UI Documentation
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Omni ERP API Documentation',
    customfavIcon: '/favicon.ico',
  })
);

// Swagger JSON endpoint
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     tags: [Health]
 *     description: Returns basic API information and available endpoints
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
app.get('/api', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Omni ERP API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs',
      swagger: '/api/docs.json',
    },
  });
});

// Mount API routes
app.use('/api/v1', apiRoutes);

// Additional routes will be mounted here as they are created
// app.use('/api/v1/erp', erpRoutes);
// app.use('/api/v1/workflows', workflowRoutes);
// app.use('/api/v1/ai', aiRoutes);
// app.use('/api/v1/mcp', mcpRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

export default app;

