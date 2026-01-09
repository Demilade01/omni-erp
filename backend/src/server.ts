import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Start server
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server started successfully`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 Server running on port ${env.PORT}`);
  logger.info(`🔗 API URL: http://localhost:${env.PORT}/api`);
  logger.info(`💚 Health check: http://localhost:${env.PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', {
    reason: reason.message,
    stack: reason.stack,
  });
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default server;

