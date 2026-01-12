/**
 * Connector Error Classes
 * Custom error types for connector operations
 */

/**
 * Base connector error
 */
export class ConnectorError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly connectorId?: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'CONNECTOR_ERROR',
    statusCode: number = 500,
    options?: {
      connectorId?: string;
      originalError?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'ConnectorError';
    this.code = code;
    this.statusCode = statusCode;
    this.connectorId = options?.connectorId;
    this.originalError = options?.originalError;
    this.context = options?.context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Connection error
 */
export class ConnectionError extends ConnectorError {
  constructor(message: string, connectorId?: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', 503, { connectorId, originalError });
    this.name = 'ConnectionError';
  }

  static cannotConnect(connectorId: string, reason?: string): ConnectionError {
    return new ConnectionError(
      `Cannot connect to ERP system${reason ? `: ${reason}` : ''}`,
      connectorId
    );
  }

  static timeout(connectorId: string, timeout: number): ConnectionError {
    return new ConnectionError(
      `Connection timeout after ${timeout}ms`,
      connectorId
    );
  }

  static alreadyConnected(connectorId: string): ConnectionError {
    return new ConnectionError('Already connected to ERP system', connectorId);
  }

  static notConnected(connectorId: string): ConnectionError {
    return new ConnectionError('Not connected to ERP system', connectorId);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ConnectorError {
  constructor(message: string, connectorId?: string, originalError?: Error) {
    super(message, 'AUTHENTICATION_ERROR', 401, { connectorId, originalError });
    this.name = 'AuthenticationError';
  }

  static invalidCredentials(connectorId: string): AuthenticationError {
    return new AuthenticationError('Invalid credentials', connectorId);
  }

  static tokenExpired(connectorId: string): AuthenticationError {
    return new AuthenticationError('Authentication token expired', connectorId);
  }

  static tokenRefreshFailed(connectorId: string): AuthenticationError {
    return new AuthenticationError('Failed to refresh access token', connectorId);
  }

  static unsupportedAuthType(authType: string): AuthenticationError {
    return new AuthenticationError(`Unsupported authentication type: ${authType}`);
  }
}

/**
 * Request error
 */
export class RequestError extends ConnectorError {
  public readonly method?: string;
  public readonly url?: string;
  public readonly responseData?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    options?: {
      connectorId?: string;
      originalError?: Error;
      method?: string;
      url?: string;
      responseData?: unknown;
    }
  ) {
    super(message, 'REQUEST_ERROR', statusCode, {
      connectorId: options?.connectorId,
      originalError: options?.originalError,
      context: {
        method: options?.method,
        url: options?.url,
        responseData: options?.responseData,
      },
    });
    this.name = 'RequestError';
    this.method = options?.method;
    this.url = options?.url;
    this.responseData = options?.responseData;
  }

  static badRequest(message: string, connectorId?: string): RequestError {
    return new RequestError(message, 400, { connectorId });
  }

  static notFound(resource: string, connectorId?: string): RequestError {
    return new RequestError(`Resource not found: ${resource}`, 404, {
      connectorId,
    });
  }

  static serverError(message: string, connectorId?: string): RequestError {
    return new RequestError(message, 500, { connectorId });
  }

  static networkError(connectorId: string, originalError?: Error): RequestError {
    return new RequestError('Network error occurred', 503, {
      connectorId,
      originalError,
    });
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ConnectorError {
  public readonly retryAfter?: number; // Seconds until retry

  constructor(message: string, connectorId?: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429, {
      connectorId,
      context: { retryAfter },
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  static exceeded(connectorId: string, retryAfter?: number): RateLimitError {
    return new RateLimitError(
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
      connectorId,
      retryAfter
    );
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends ConnectorError {
  public readonly nextAttemptTime?: Date;

  constructor(message: string, connectorId?: string, nextAttemptTime?: Date) {
    super(message, 'CIRCUIT_BREAKER_OPEN', 503, {
      connectorId,
      context: { nextAttemptTime },
    });
    this.name = 'CircuitBreakerError';
    this.nextAttemptTime = nextAttemptTime;
  }

  static open(connectorId: string, nextAttemptTime: Date): CircuitBreakerError {
    return new CircuitBreakerError(
      'Circuit breaker is open, request blocked',
      connectorId,
      nextAttemptTime
    );
  }
}

/**
 * Validation error
 */
export class ValidationError extends ConnectorError {
  public readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    validationErrors?: Record<string, string[]>,
    connectorId?: string
  ) {
    super(message, 'VALIDATION_ERROR', 400, {
      connectorId,
      context: { validationErrors },
    });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }

  static invalidConfig(errors: Record<string, string[]>): ValidationError {
    return new ValidationError('Invalid connector configuration', errors);
  }

  static invalidRequest(errors: Record<string, string[]>): ValidationError {
    return new ValidationError('Invalid request parameters', errors);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends ConnectorError {
  constructor(message: string, connectorId?: string) {
    super(message, 'CONFIGURATION_ERROR', 500, { connectorId });
    this.name = 'ConfigurationError';
  }

  static missing(field: string): ConfigurationError {
    return new ConfigurationError(`Missing required configuration: ${field}`);
  }

  static invalid(field: string, reason?: string): ConfigurationError {
    return new ConfigurationError(
      `Invalid configuration for ${field}${reason ? `: ${reason}` : ''}`
    );
  }
}

/**
 * Type guard to check if error is a ConnectorError
 */
export function isConnectorError(error: unknown): error is ConnectorError {
  return error instanceof ConnectorError;
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Extract error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isConnectorError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return error.name;
  }
  return 'UNKNOWN_ERROR';
}

