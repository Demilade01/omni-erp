import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvConfig {
  // App
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;

  // Database
  MONGODB_URI: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;

  // OpenAI
  OPENAI_API_KEY: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Logging
  LOG_LEVEL: string;
  LOG_FILE_PATH: string;

  // MCP
  MCP_SERVER_PORT: number;
  MCP_SERVER_HOST: string;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
    return parsed;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${key} is required but not set`);
};

export const env: EnvConfig = {
  // App
  NODE_ENV: getEnvVariable('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 5000),
  FRONTEND_URL: getEnvVariable('FRONTEND_URL', 'http://localhost:3000'),

  // Database
  MONGODB_URI: getEnvVariable(
    'MONGODB_URI',
    'mongodb://localhost:27017/omni-erp'
  ),

  // JWT
  JWT_SECRET: getEnvVariable('JWT_SECRET', 'your-super-secret-jwt-key-change-this'),
  JWT_EXPIRES_IN: getEnvVariable('JWT_EXPIRES_IN', '7d'),
  REFRESH_TOKEN_SECRET: getEnvVariable(
    'REFRESH_TOKEN_SECRET',
    'your-refresh-token-secret-change-this'
  ),
  REFRESH_TOKEN_EXPIRES_IN: getEnvVariable('REFRESH_TOKEN_EXPIRES_IN', '30d'),

  // OpenAI
  OPENAI_API_KEY: getEnvVariable('OPENAI_API_KEY', ''),

  // Redis
  REDIS_HOST: getEnvVariable('REDIS_HOST', 'localhost'),
  REDIS_PORT: getEnvNumber('REDIS_PORT', 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  // Logging
  LOG_LEVEL: getEnvVariable('LOG_LEVEL', 'info'),
  LOG_FILE_PATH: getEnvVariable('LOG_FILE_PATH', './logs'),

  // MCP
  MCP_SERVER_PORT: getEnvNumber('MCP_SERVER_PORT', 5001),
  MCP_SERVER_HOST: getEnvVariable('MCP_SERVER_HOST', 'localhost'),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

