/**
 * Connector Types and Interfaces
 * Defines all types used across the connector system
 */

import { AuthType, ERPType } from '../../types';

/**
 * Connector status enum
 */
export enum ConnectorStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

/**
 * Connector configuration interface
 */
export interface ConnectorConfig {
  id: string;
  name: string;
  erpType: ERPType;
  baseUrl: string;
  authType: AuthType;
  credentials: ConnectorCredentials;
  timeout?: number; // Request timeout in ms (default: 30000)
  retryAttempts?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 1000)
  rateLimit?: RateLimitConfig;
  metadata?: Record<string, unknown>;
}

/**
 * Connector credentials (varies by auth type)
 */
export type ConnectorCredentials =
  | OAuth2Credentials
  | ApiKeyCredentials
  | BasicAuthCredentials
  | JWTCredentials;

/**
 * OAuth 2.0 credentials
 */
export interface OAuth2Credentials {
  type: AuthType.OAUTH2;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * API Key credentials
 */
export interface ApiKeyCredentials {
  type: AuthType.API_KEY;
  apiKey: string;
  headerName?: string; // Default: 'X-API-Key'
  prefix?: string; // e.g., 'Bearer ', 'ApiKey '
}

/**
 * Basic Auth credentials
 */
export interface BasicAuthCredentials {
  type: AuthType.BASIC;
  username: string;
  password: string;
}

/**
 * JWT credentials
 */
export interface JWTCredentials {
  type: AuthType.JWT;
  token: string;
  expiresAt?: Date;
  refreshToken?: string;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
  strategy?: 'token-bucket' | 'sliding-window'; // Default: 'token-bucket'
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  retry?: boolean; // Enable retry (default: true)
  validateStatus?: (status: number) => boolean;
}

/**
 * HTTP response interface
 */
export interface ConnectorResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestOptions;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  status: ConnectorStatus;
  message: string;
  responseTime?: number; // in ms
  metadata?: {
    version?: string;
    endpoint?: string;
    features?: string[];
  };
  error?: {
    code?: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Retry strategy options
 */
export interface RetryOptions {
  attempts: number; // Number of retry attempts
  delay: number; // Initial delay in ms
  maxDelay: number; // Maximum delay in ms
  backoffMultiplier: number; // Exponential backoff multiplier (default: 2)
  retryableStatuses: number[]; // HTTP status codes to retry
  retryableErrors: string[]; // Error codes/messages to retry
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit is open, requests fail fast
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening (default: 5)
  successThreshold: number; // Number of successes to close (default: 2)
  timeout: number; // Time to wait before half-open (default: 60000ms)
  monitoringPeriod: number; // Time window for tracking failures (default: 120000ms)
}

/**
 * Circuit breaker state info
 */
export interface CircuitBreakerInfo {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

/**
 * Connector event types
 */
export enum ConnectorEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  REQUEST_START = 'request:start',
  REQUEST_END = 'request:end',
  REQUEST_ERROR = 'request:error',
  RATE_LIMIT_HIT = 'rate_limit:hit',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker:open',
  CIRCUIT_BREAKER_CLOSE = 'circuit_breaker:close',
}

/**
 * Connector event payload
 */
export interface ConnectorEventPayload {
  connectorId: string;
  event: ConnectorEvent;
  timestamp: Date;
  data?: unknown;
  error?: Error;
}

/**
 * Connector metrics
 */
export interface ConnectorMetrics {
  connectorId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  rateLimitHits: number;
  circuitBreakerOpens: number;
  uptime: number; // in ms
}

