/**
 * Base Connector
 * Abstract base class for all ERP connectors
 */

import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import {
  ConnectorConfig,
  ConnectorStatus,
  ConnectionTestResult,
  ConnectorMetrics,
  RequestOptions,
  ConnectorResponse,
} from '../types/connector.types';
import { HttpClient } from '../http/HttpClient';
import { AuthHandlerFactory, IAuthHandler } from '../auth/AuthHandler';
import { RateLimiter } from '../utils/RateLimiter';
import { ConnectionTester } from '../utils/ConnectionTester';
import {
  ConnectionError,
  ConfigurationError
} from '../errors/ConnectorError';

/**
 * Abstract Base Connector Class
 */
export abstract class BaseConnector extends EventEmitter {
  protected config: ConnectorConfig;
  protected httpClient: HttpClient;
  protected authHandler: IAuthHandler;
  protected rateLimiter?: RateLimiter;
  protected connectionTester: ConnectionTester;
  protected status: ConnectorStatus;
  protected metrics: ConnectorMetrics;
  protected connectedAt?: Date;

  constructor(config: ConnectorConfig) {
    super();
    this.validateConfig(config);
    this.config = config;
    this.status = ConnectorStatus.DISCONNECTED;

    // Initialize metrics
    this.metrics = {
      connectorId: config.id,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      circuitBreakerOpens: 0,
      uptime: 0,
    };

    // Create auth handler
    this.authHandler = AuthHandlerFactory.create(config.credentials, config.id);

    // Create rate limiter if config provided
    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.id, config.rateLimit);
      this.setupRateLimiterEvents();
    }

    // Create HTTP client
    this.httpClient = new HttpClient(
      config,
      this.authHandler,
      this.rateLimiter
    );

    // Setup circuit breaker events
    this.setupCircuitBreakerEvents();

    // Create connection tester
    this.connectionTester = new ConnectionTester(config.id, this.httpClient);

    logger.info(`[${config.id}] Connector initialized: ${config.name} (${config.erpType})`);
  }

  /**
   * Connect to ERP system
   */
  async connect(): Promise<void> {
    if (this.status === ConnectorStatus.CONNECTED) {
      throw ConnectionError.alreadyConnected(this.config.id);
    }

    try {
      this.status = ConnectorStatus.CONNECTING;
      this.emit('connecting', { connectorId: this.config.id });

      logger.info(`[${this.config.id}] Connecting to ERP system...`);

      // Authenticate
      await this.authHandler.authenticate(this.httpClient.getAxiosInstance());

      // Test connection
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw ConnectionError.cannotConnect(
          this.config.id,
          testResult.error?.message
        );
      }

      // Custom initialization (implemented by subclasses)
      await this.onConnect();

      this.status = ConnectorStatus.CONNECTED;
      this.connectedAt = new Date();
      this.emit('connected', { connectorId: this.config.id });

      logger.info(`[${this.config.id}] Successfully connected to ERP system`);
    } catch (error) {
      this.status = ConnectorStatus.ERROR;
      this.emit('error', { connectorId: this.config.id, error });

      logger.error(`[${this.config.id}] Connection failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from ERP system
   */
  async disconnect(): Promise<void> {
    if (this.status === ConnectorStatus.DISCONNECTED) {
      return;
    }

    try {
      logger.info(`[${this.config.id}] Disconnecting from ERP system...`);

      // Custom cleanup (implemented by subclasses)
      await this.onDisconnect();

      this.status = ConnectorStatus.DISCONNECTED;
      this.connectedAt = undefined;
      this.emit('disconnected', { connectorId: this.config.id });

      logger.info(`[${this.config.id}] Successfully disconnected`);
    } catch (error) {
      logger.error(`[${this.config.id}] Disconnect error:`, error);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      return await this.connectionTester.testConnection(
        this.getHealthCheckPath()
      );
    } catch (error) {
      throw ConnectionError.cannotConnect(
        this.config.id,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Execute HTTP request (with metrics tracking)
   */
  protected async request<T = unknown>(
    options: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    this.ensureConnected();

    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const response = await this.httpClient.request<T>(options);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(responseTime);
      this.metrics.lastRequestTime = new Date();

      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  /**
   * GET request
   */
  protected async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const response = await this.request<T>({
      method: 'GET',
      url,
      params,
    });
    return response.data;
  }

  /**
   * POST request
   */
  protected async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.request<T>({
      method: 'POST',
      url,
      data,
    });
    return response.data;
  }

  /**
   * PUT request
   */
  protected async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.request<T>({
      method: 'PUT',
      url,
      data,
    });
    return response.data;
  }

  /**
   * PATCH request
   */
  protected async patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.request<T>({
      method: 'PATCH',
      url,
      data,
    });
    return response.data;
  }

  /**
   * DELETE request
   */
  protected async delete<T = unknown>(url: string): Promise<T> {
    const response = await this.request<T>({
      method: 'DELETE',
      url,
    });
    return response.data;
  }

  /**
   * Get connector status
   */
  getStatus(): ConnectorStatus {
    return this.status;
  }

  /**
   * Get connector configuration
   */
  getConfig(): ConnectorConfig {
    return { ...this.config };
  }

  /**
   * Get connector metrics
   */
  getMetrics(): ConnectorMetrics {
    return {
      ...this.metrics,
      uptime: this.connectedAt
        ? Date.now() - this.connectedAt.getTime()
        : 0,
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === ConnectorStatus.CONNECTED;
  }

  /**
   * Ensure connector is connected
   */
  protected ensureConnected(): void {
    if (!this.isConnected()) {
      throw ConnectionError.notConnected(this.config.id);
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalTime =
      this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1);
    this.metrics.averageResponseTime =
      (totalTime + responseTime) / this.metrics.successfulRequests;
  }

  /**
   * Setup rate limiter events
   */
  private setupRateLimiterEvents(): void {
    if (!this.rateLimiter) return;

    this.rateLimiter.on('rate_limit_hit', () => {
      this.metrics.rateLimitHits++;
      this.emit('rate_limit_hit', {
        connectorId: this.config.id,
        info: this.rateLimiter?.getInfo(),
      });
    });
  }

  /**
   * Setup circuit breaker events
   */
  private setupCircuitBreakerEvents(): void {
    const circuitBreaker = (this.httpClient as any).circuitBreaker;
    if (!circuitBreaker) return;

    circuitBreaker.on('open', () => {
      this.metrics.circuitBreakerOpens++;
      this.emit('circuit_breaker_open', {
        connectorId: this.config.id,
        info: this.httpClient.getCircuitBreakerInfo(),
      });
    });

    circuitBreaker.on('close', () => {
      this.emit('circuit_breaker_close', {
        connectorId: this.config.id,
      });
    });
  }

  /**
   * Validate connector configuration
   */
  private validateConfig(config: ConnectorConfig): void {
    if (!config.id) {
      throw ConfigurationError.missing('id');
    }
    if (!config.name) {
      throw ConfigurationError.missing('name');
    }
    if (!config.erpType) {
      throw ConfigurationError.missing('erpType');
    }
    if (!config.baseUrl) {
      throw ConfigurationError.missing('baseUrl');
    }
    if (!config.authType) {
      throw ConfigurationError.missing('authType');
    }
    if (!config.credentials) {
      throw ConfigurationError.missing('credentials');
    }
  }

  /**
   * Abstract methods to be implemented by subclasses
   */

  /**
   * Get health check endpoint path
   */
  protected abstract getHealthCheckPath(): string;

  /**
   * Custom initialization logic
   */
  protected abstract onConnect(): Promise<void>;

  /**
   * Custom cleanup logic
   */
  protected abstract onDisconnect(): Promise<void>;
}

