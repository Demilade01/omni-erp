/**
 * Circuit Breaker
 * Implements circuit breaker pattern to prevent cascading failures
 */

import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import {
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerInfo,
} from '../types/connector.types';
import { CircuitBreakerError } from '../errors/ConnectorError';

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 60 seconds
  monitoringPeriod: 120000, // 2 minutes
};

/**
 * Circuit Breaker Class
 */
export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private failureCount: number;
  private successCount: number;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private readonly connectorId: string;

  constructor(connectorId: string, config?: Partial<CircuitBreakerConfig>) {
    super();
    this.connectorId = connectorId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.halfOpen();
      } else {
        throw CircuitBreakerError.open(
          this.connectorId,
          this.nextAttemptTime || new Date()
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      logger.debug(
        `[${this.connectorId}] Circuit breaker success count: ${this.successCount}/${this.config.successThreshold}`
      );

      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    } else {
      this.failureCount = 0; // Reset failure count on success
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.failureCount++;

    logger.debug(
      `[${this.connectorId}] Circuit breaker failure count: ${this.failureCount}/${this.config.failureThreshold}`
    );

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.open();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * Transition to CLOSED state
   */
  private close(): void {
    logger.info(`[${this.connectorId}] Circuit breaker closing`);
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = undefined;
    this.emit('close', this.getInfo());
  }

  /**
   * Transition to OPEN state
   */
  private open(): void {
    logger.warn(`[${this.connectorId}] Circuit breaker opening`);
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    this.successCount = 0;
    this.emit('open', this.getInfo());
  }

  /**
   * Transition to HALF_OPEN state
   */
  private halfOpen(): void {
    logger.info(`[${this.connectorId}] Circuit breaker half-opening`);
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    this.failureCount = 0;
    this.emit('half_open', this.getInfo());
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get circuit breaker info
   */
  getInfo(): CircuitBreakerInfo {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    logger.info(`[${this.connectorId}] Circuit breaker manually reset`);
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
    this.emit('reset', this.getInfo());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.debug(`[${this.connectorId}] Circuit breaker config updated`);
  }

  /**
   * Get configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }
}

