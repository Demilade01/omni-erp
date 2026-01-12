/**
 * Retry Strategy
 * Implements retry logic with exponential backoff
 */

import { logger } from '../../config/logger';
import { RetryOptions } from '../types/connector.types';

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  attempts: 3,
  delay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'],
};

/**
 * Retry Strategy Class
 */
export class RetryStrategy {
  private options: RetryOptions;

  constructor(options?: Partial<RetryOptions>) {
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context: string = 'Request'
  ): Promise<T> {
    let lastError: Error | unknown;
    let attempt = 0;

    while (attempt < this.options.attempts) {
      try {
        attempt++;
        logger.debug(`${context} - Attempt ${attempt}/${this.options.attempts}`);
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt);
        logger.warn(
          `${context} - Attempt ${attempt} failed, retrying in ${delay}ms`,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt,
            maxAttempts: this.options.attempts,
          }
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    logger.error(`${context} - All ${this.options.attempts} attempts failed`, {
      lastError: lastError instanceof Error ? lastError.message : 'Unknown error',
    });
    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    // Don't retry if max attempts reached
    if (attempt >= this.options.attempts) {
      return false;
    }

    // Check for retryable HTTP status codes
    if (this.hasRetryableStatus(error)) {
      return true;
    }

    // Check for retryable error codes
    if (this.hasRetryableErrorCode(error)) {
      return true;
    }

    return false;
  }

  /**
   * Check if error has retryable HTTP status
   */
  private hasRetryableStatus(error: unknown): boolean {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response
    ) {
      const status = (error.response as { status: number }).status;
      return this.options.retryableStatuses.includes(status);
    }
    return false;
  }

  /**
   * Check if error has retryable error code
   */
  private hasRetryableErrorCode(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      return this.options.retryableErrors.includes(code);
    }
    return false;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.options.delay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.options.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry options
   */
  getOptions(): RetryOptions {
    return { ...this.options };
  }

  /**
   * Update retry options
   */
  updateOptions(options: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

