/**
 * HTTP Client
 * Wrapper around axios with retry logic and circuit breaker
 */

import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { logger } from '../../config/logger';
import {
  RequestOptions,
  ConnectorResponse,
  ConnectorConfig,
} from '../types/connector.types';
import { RetryStrategy } from './RetryStrategy';
import { CircuitBreaker } from './CircuitBreaker';
import { RateLimiter } from '../utils/RateLimiter';
import { IAuthHandler } from '../auth/AuthHandler';
import { RequestError, ConnectionError } from '../errors/ConnectorError';

/**
 * HTTP Client Class
 */
export class HttpClient {
  private client: AxiosInstance;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter?: RateLimiter;
  private authHandler?: IAuthHandler;
  private readonly connectorId: string;

  constructor(
    config: ConnectorConfig,
    authHandler?: IAuthHandler,
    rateLimiter?: RateLimiter
  ) {
    this.connectorId = config.id;
    this.authHandler = authHandler;
    this.rateLimiter = rateLimiter;

    // Create axios instance
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Initialize retry strategy
    this.retryStrategy = new RetryStrategy({
      attempts: config.retryAttempts || 3,
      delay: config.retryDelay || 1000,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.connectorId);

    // Setup interceptors
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add authentication headers
        if (this.authHandler) {
          const authHeaders = this.authHandler.getAuthHeaders();
          Object.assign(config.headers, authHeaders);
        }

        logger.debug(`[${this.connectorId}] Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`[${this.connectorId}] Request interceptor error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(
          `[${this.connectorId}] Response: ${response.status} ${response.statusText}`
        );
        return response;
      },
      async (error: AxiosError) => {
        // Handle token expiration
        if (error.response?.status === 401 && this.authHandler?.refreshToken) {
          try {
            await this.authHandler.refreshToken();
            // Retry the original request
            if (error.config) {
              return this.client.request(error.config);
            }
          } catch (refreshError) {
            logger.error(`[${this.connectorId}] Token refresh failed:`, refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute HTTP request
   */
  async request<T = unknown>(
    options: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    // Check rate limit
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    // Execute with circuit breaker
    return this.circuitBreaker.execute(async () => {
      // Execute with retry strategy
      const executeRequest = async (): Promise<ConnectorResponse<T>> => {
        try {
          const response = await this.client.request<T>({
            method: options.method,
            url: options.url,
            headers: options.headers,
            params: options.params,
            data: options.data,
            timeout: options.timeout,
            validateStatus: options.validateStatus,
          });

          return this.transformResponse<T>(response);
        } catch (error) {
          throw this.transformError(error, options);
        }
      };

      // Execute with retry if enabled
      if (options.retry !== false) {
        return this.retryStrategy.execute(
          executeRequest,
          `[${this.connectorId}] ${options.method} ${options.url}`
        );
      }

      return executeRequest();
    });
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    options?: Partial<RequestOptions>
  ): Promise<ConnectorResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...options,
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: Partial<RequestOptions>
  ): Promise<ConnectorResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: Partial<RequestOptions>
  ): Promise<ConnectorResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...options,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: Partial<RequestOptions>
  ): Promise<ConnectorResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    options?: Partial<RequestOptions>
  ): Promise<ConnectorResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...options,
    });
  }

  /**
   * Transform axios response to connector response
   */
  private transformResponse<T>(response: AxiosResponse<T>): ConnectorResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      config: {
        method: (response.config.method?.toUpperCase() || 'GET') as RequestOptions['method'],
        url: response.config.url || '',
        headers: response.config.headers as Record<string, string>,
        params: response.config.params,
        data: response.config.data,
      },
    };
  }

  /**
   * Transform error to connector error
   */
  private transformError(error: unknown, options: RequestOptions): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error
      if (!axiosError.response) {
        return RequestError.networkError(this.connectorId, axiosError);
      }

      // HTTP error
      return new RequestError(
        axiosError.message || 'Request failed',
        axiosError.response.status,
        {
          connectorId: this.connectorId,
          originalError: axiosError,
          method: options.method,
          url: options.url,
          responseData: axiosError.response.data,
        }
      );
    }

    // Connection timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      return ConnectionError.timeout(this.connectorId, options.timeout || 30000);
    }

    // Unknown error
    return new RequestError(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      {
        connectorId: this.connectorId,
        originalError: error instanceof Error ? error : undefined,
        method: options.method,
        url: options.url,
      }
    );
  }

  /**
   * Get circuit breaker info
   */
  getCircuitBreakerInfo() {
    return this.circuitBreaker.getInfo();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get axios instance (for advanced usage)
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Update retry strategy options
   */
  updateRetryOptions(options: Partial<{
    attempts: number;
    delay: number;
    maxDelay: number;
    backoffMultiplier: number;
  }>): void {
    this.retryStrategy.updateOptions(options);
  }
}

