/**
 * Connection Tester
 * Tests ERP system connectivity and retrieves metadata
 */

import { logger } from '../../config/logger';
import { HttpClient } from '../http/HttpClient';
import {
  ConnectionTestResult,
  ConnectorStatus,
} from '../types/connector.types';
import { ConnectionError } from '../errors/ConnectorError';

/**
 * Connection Tester Class
 */
export class ConnectionTester {
  private httpClient: HttpClient;
  private connectorId: string;

  constructor(connectorId: string, httpClient: HttpClient) {
    this.connectorId = connectorId;
    this.httpClient = httpClient;
  }

  /**
   * Test connection with health check endpoint
   */
  async testConnection(
    healthCheckPath: string = '/',
    customTest?: () => Promise<boolean>
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      logger.info(`[${this.connectorId}] Testing connection...`);

      // Custom test function if provided
      if (customTest) {
        const success = await customTest();
        const responseTime = Date.now() - startTime;

        return {
          success,
          status: success ? ConnectorStatus.CONNECTED : ConnectorStatus.ERROR,
          message: success
            ? 'Connection test successful (custom test)'
            : 'Connection test failed (custom test)',
          responseTime,
        };
      }

      // Default health check
      const response = await this.httpClient.get(healthCheckPath, undefined, {
        timeout: 10000,
        retry: false,
      });

      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      return {
        success,
        status: success ? ConnectorStatus.CONNECTED : ConnectorStatus.ERROR,
        message: success
          ? `Connection successful (${response.status} ${response.statusText})`
          : `Connection failed with status ${response.status}`,
        responseTime,
        metadata: {
          endpoint: healthCheckPath,
          version: this.extractVersion(response.data),
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`[${this.connectorId}] Connection test failed:`, error);

      return {
        success: false,
        status: ConnectorStatus.ERROR,
        message: 'Connection test failed',
        responseTime,
        error: {
          code: error instanceof ConnectionError ? error.code : 'CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }

  /**
   * Test authentication
   */
  async testAuthentication(
    authTestPath: string = '/api/auth/verify'
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      logger.info(`[${this.connectorId}] Testing authentication...`);

      const response = await this.httpClient.get(authTestPath, undefined, {
        timeout: 10000,
        retry: false,
      });

      const responseTime = Date.now() - startTime;
      const success = response.status === 200;

      return {
        success,
        status: success ? ConnectorStatus.CONNECTED : ConnectorStatus.ERROR,
        message: success
          ? 'Authentication successful'
          : 'Authentication failed',
        responseTime,
        metadata: {
          endpoint: authTestPath,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`[${this.connectorId}] Authentication test failed:`, error);

      return {
        success: false,
        status: ConnectorStatus.ERROR,
        message: 'Authentication test failed',
        responseTime,
        error: {
          code: error instanceof ConnectionError ? error.code : 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }

  /**
   * Fetch system metadata
   */
  async fetchMetadata(
    metadataPath: string = '/api/metadata'
  ): Promise<Record<string, unknown>> {
    try {
      logger.info(`[${this.connectorId}] Fetching system metadata...`);

      const response = await this.httpClient.get(metadataPath, undefined, {
        timeout: 15000,
      });

      logger.debug(`[${this.connectorId}] Metadata retrieved successfully`);
      return response.data as Record<string, unknown>;
    } catch (error) {
      logger.error(`[${this.connectorId}] Failed to fetch metadata:`, error);
      throw error;
    }
  }

  /**
   * Ping endpoint (simple connectivity check)
   */
  async ping(endpoint: string = '/'): Promise<number> {
    const startTime = Date.now();

    try {
      await this.httpClient.get(endpoint, undefined, {
        timeout: 5000,
        retry: false,
      });

      return Date.now() - startTime;
    } catch (error) {
      logger.error(`[${this.connectorId}] Ping failed:`, error);
      throw error;
    }
  }

  /**
   * Comprehensive connection test
   */
  async runFullTest(options?: {
    healthCheckPath?: string;
    authTestPath?: string;
    metadataPath?: string;
  }): Promise<{
    overall: ConnectionTestResult;
    details: {
      connectivity: ConnectionTestResult;
      authentication: ConnectionTestResult;
      metadata?: Record<string, unknown>;
    };
  }> {
    logger.info(`[${this.connectorId}] Running full connection test...`);

    // Test connectivity
    const connectivity = await this.testConnection(options?.healthCheckPath);

    if (!connectivity.success) {
      return {
        overall: connectivity,
        details: {
          connectivity,
          authentication: {
            success: false,
            status: ConnectorStatus.ERROR,
            message: 'Skipped due to connectivity failure',
          },
        },
      };
    }

    // Test authentication
    const authentication = await this.testAuthentication(options?.authTestPath);

    // Try to fetch metadata (optional)
    let metadata: Record<string, unknown> | undefined;
    try {
      metadata = await this.fetchMetadata(options?.metadataPath);
    } catch (error) {
      logger.warn(`[${this.connectorId}] Metadata fetch failed:`, error);
    }

    // Overall result
    const overall: ConnectionTestResult = {
      success: connectivity.success && authentication.success,
      status:
        connectivity.success && authentication.success
          ? ConnectorStatus.CONNECTED
          : ConnectorStatus.ERROR,
      message:
        connectivity.success && authentication.success
          ? 'All tests passed'
          : 'Some tests failed',
      responseTime:
        (connectivity.responseTime || 0) + (authentication.responseTime || 0),
      metadata: {
        ...connectivity.metadata,
        ...authentication.metadata,
        features: metadata ? Object.keys(metadata) : undefined,
      },
    };

    return {
      overall,
      details: {
        connectivity,
        authentication,
        metadata,
      },
    };
  }

  /**
   * Extract version from response data
   */
  private extractVersion(data: unknown): string | undefined {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return (
        (obj.version as string) ||
        (obj.apiVersion as string) ||
        (obj.api_version as string) ||
        undefined
      );
    }
    return undefined;
  }
}

