/**
 * Rate Limiter
 * Implements token bucket algorithm for rate limiting
 */

import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { RateLimitConfig } from '../types/connector.types';
import { RateLimitError } from '../errors/ConnectorError';

/**
 * Rate Limiter Class
 */
export class RateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefillTime: number;
  private readonly connectorId: string;
  private readonly queue: Array<() => void>;
  private isProcessingQueue: boolean;

  constructor(connectorId: string, config: RateLimitConfig) {
    super();
    this.connectorId = connectorId;
    this.config = config;
    this.tokens = config.maxRequests;
    this.lastRefillTime = Date.now();
    this.queue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Acquire a token (wait if necessary)
   */
  async acquire(): Promise<void> {
    // Refill tokens if needed
    this.refillTokens();

    // If tokens available, consume and return
    if (this.tokens > 0) {
      this.tokens--;
      logger.debug(
        `[${this.connectorId}] Rate limit token acquired, ${this.tokens} remaining`
      );
      return;
    }

    // No tokens available, add to queue
    logger.debug(`[${this.connectorId}] Rate limit reached, queuing request`);
    this.emit('rate_limit_hit', {
      connectorId: this.connectorId,
      queueSize: this.queue.length,
    });

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Try to acquire a token without waiting
   */
  tryAcquire(): boolean {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    this.emit('rate_limit_hit', {
      connectorId: this.connectorId,
      queueSize: this.queue.length,
    });

    return false;
  }

  /**
   * Acquire or throw error if not available
   */
  acquireOrThrow(): void {
    if (!this.tryAcquire()) {
      const retryAfter = this.getRetryAfter();
      throw RateLimitError.exceeded(this.connectorId, retryAfter);
    }
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefillTime;

    // Calculate tokens to add based on time elapsed
    const tokensToAdd = Math.floor(
      (timeSinceLastRefill / this.config.windowMs) * this.config.maxRequests
    );

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.maxRequests, this.tokens + tokensToAdd);
      this.lastRefillTime = now;

      logger.debug(
        `[${this.connectorId}] Rate limit tokens refilled: ${this.tokens}/${this.config.maxRequests}`
      );
    }
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      // Refill tokens
      this.refillTokens();

      // If no tokens, wait and try again
      if (this.tokens === 0) {
        const waitTime = this.getRetryAfter() * 1000;
        logger.debug(
          `[${this.connectorId}] Waiting ${waitTime}ms for rate limit refresh`
        );
        await this.sleep(waitTime);
        continue;
      }

      // Process queued request
      const resolve = this.queue.shift();
      if (resolve) {
        this.tokens--;
        resolve();
        logger.debug(
          `[${this.connectorId}] Processed queued request, ${this.queue.length} remaining`
        );
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get seconds until tokens are available
   */
  getRetryAfter(): number {
    if (this.tokens > 0) {
      return 0;
    }

    const timeSinceLastRefill = Date.now() - this.lastRefillTime;
    const timeUntilRefill = this.config.windowMs - timeSinceLastRefill;
    return Math.ceil(timeUntilRefill / 1000);
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get rate limit info
   */
  getInfo(): {
    connectorId: string;
    availableTokens: number;
    maxTokens: number;
    queueSize: number;
    retryAfter: number;
    windowMs: number;
  } {
    return {
      connectorId: this.connectorId,
      availableTokens: this.getAvailableTokens(),
      maxTokens: this.config.maxRequests,
      queueSize: this.queue.length,
      retryAfter: this.getRetryAfter(),
      windowMs: this.config.windowMs,
    };
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.tokens = this.config.maxRequests;
    this.lastRefillTime = Date.now();
    this.queue.length = 0;
    logger.debug(`[${this.connectorId}] Rate limiter reset`);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    this.tokens = Math.min(this.tokens, this.config.maxRequests);
    logger.debug(`[${this.connectorId}] Rate limiter config updated`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

