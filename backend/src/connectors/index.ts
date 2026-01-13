/**
 * Connectors Module
 * Exports all connector-related classes and utilities
 */

// Base Connector
export { BaseConnector } from './base/BaseConnector';

// Types
export * from './types/connector.types';

// Errors
export * from './errors/ConnectorError';

// Authentication
export {
  IAuthHandler,
  OAuth2Handler,
  ApiKeyHandler,
  BasicAuthHandler,
  JWTHandler,
  AuthHandlerFactory,
} from './auth/AuthHandler';

// HTTP
export { HttpClient } from './http/HttpClient';
export { RetryStrategy } from './http/RetryStrategy';
export { CircuitBreaker } from './http/CircuitBreaker';

// Utilities
export { RateLimiter } from './utils/RateLimiter';
export { ConnectionTester } from './utils/ConnectionTester';

// REST Connector
export { RESTConnector, QueryBuilder } from './rest';
export * from './rest/types';

// OData Connector
export { ODataConnector, ODataQueryBuilder } from './odata';
export * from './odata/types';

