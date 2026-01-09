import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Start server with database connection
let server: any;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase();

    // Then start Express server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server started successfully`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 Server running on port ${env.PORT}`);
      logger.info(`🔗 API URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`📚 API Docs: http://localhost:${env.PORT}/api/docs`);
      logger.info(`💚 Health check: http://localhost:${env.PORT}/health`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize server
startServer();

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

