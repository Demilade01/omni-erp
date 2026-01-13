/**
 * Connector Service
 * Manages ERP connector instances and operations
 */

import { logger } from '../config/logger';
import { BaseConnector, RESTConnector, ODataConnector } from '../connectors';
import { ERPConnection } from '../models';
import { createNotFoundError, createValidationError } from '../utils/appError';
import { ConnectorConfig, ConnectorStatus } from '../connectors/types/connector.types';
import { ODataConnectorConfig, ODataVersion } from '../connectors/odata/types';
import { AuthType, ERPType } from '../types';

/**
 * Connector Service Class
 */
class ConnectorService {
  private connectors: Map<string, BaseConnector>;

  constructor() {
    this.connectors = new Map();
  }

  /**
   * Get connector instance (create if not exists)
   */
  async getConnector(connectionId: string, userId: string): Promise<BaseConnector> {
    // Check if connector already exists
    if (this.connectors.has(connectionId)) {
      const connector = this.connectors.get(connectionId)!;
      return connector;
    }

    // Fetch connection from database (include credentials which are excluded by default)
    const connection = await ERPConnection.findOne({
      _id: connectionId,
      userId,
      isActive: true,
    }).select('+credentials');

    if (!connection) {
      throw createNotFoundError('ERP connection not found');
    }

    // Create connector config
    const config: ConnectorConfig = {
      id: connection._id.toString(),
      name: connection.name,
      erpType: connection.type,
      baseUrl: connection.baseUrl,
      authType: connection.authType,
      credentials: this.buildCredentials(connection),
      timeout: connection.config?.timeout,
      retryAttempts: connection.config?.retryAttempts,
      retryDelay: connection.config?.retryDelay,
      rateLimit: connection.config?.rateLimit,
      metadata: connection.metadata,
    };

    // Create connector instance (will be implemented by specific connector types)
    const connector = await this.createConnectorInstance(config);

    // Store connector
    this.connectors.set(connectionId, connector);

    logger.info(`[${connectionId}] Connector instance created`);
    return connector;
  }

  /**
   * Connect to ERP system
   */
  async connect(connectionId: string, userId: string): Promise<void> {
    const connector = await this.getConnector(connectionId, userId);

    if (connector.isConnected()) {
      logger.debug(`[${connectionId}] Already connected`);
      return;
    }

    await connector.connect();

    // Update connection status in database
    await ERPConnection.findByIdAndUpdate(connectionId, {
      status: 'active',
      lastConnectionAt: new Date(),
    });

    logger.info(`[${connectionId}] Connected successfully`);
  }

  /**
   * Disconnect from ERP system
   */
  async disconnect(connectionId: string): Promise<void> {
    const connector = this.connectors.get(connectionId);

    if (!connector) {
      logger.debug(`[${connectionId}] Connector not found, skipping disconnect`);
      return;
    }

    await connector.disconnect();
    this.connectors.delete(connectionId);

    // Update connection status in database
    await ERPConnection.findByIdAndUpdate(connectionId, {
      status: 'inactive',
    });

    logger.info(`[${connectionId}] Disconnected successfully`);
  }

  /**
   * Test connection
   */
  async testConnection(connectionId: string, userId: string) {
    const connector = await this.getConnector(connectionId, userId);
    return await connector.testConnection();
  }

  /**
   * Get connector status
   */
  async getStatus(connectionId: string, userId: string): Promise<ConnectorStatus> {
    const connector = await this.getConnector(connectionId, userId);
    return connector.getStatus();
  }

  /**
   * Get connector metrics
   */
  async getMetrics(connectionId: string, userId: string) {
    const connector = await this.getConnector(connectionId, userId);
    return connector.getMetrics();
  }

  /**
   * Remove connector instance
   */
  async removeConnector(connectionId: string): Promise<void> {
    const connector = this.connectors.get(connectionId);

    if (connector) {
      await connector.disconnect();
      this.connectors.delete(connectionId);
      logger.info(`[${connectionId}] Connector removed`);
    }
  }

  /**
   * Get all active connectors
   */
  getActiveConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Disconnect all connectors (cleanup)
   */
  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting all connectors...');

    const disconnectPromises = Array.from(this.connectors.keys()).map((id) =>
      this.disconnect(id).catch((error) => {
        logger.error(`Error disconnecting connector ${id}:`, error);
      })
    );

    await Promise.all(disconnectPromises);
    logger.info('All connectors disconnected');
  }

  /**
   * Build credentials object from connection
   */
  private buildCredentials(connection: any) {
    const credentials = connection.credentials;

    switch (connection.authType) {
      case AuthType.OAUTH2:
        return {
          type: AuthType.OAUTH2 as const,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          tokenUrl: credentials.tokenUrl,
          scope: credentials.scope,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt,
        };

      case AuthType.API_KEY:
        return {
          type: AuthType.API_KEY as const,
          apiKey: credentials.apiKey,
          headerName: credentials.headerName,
          prefix: credentials.prefix,
        };

      case AuthType.BASIC:
        return {
          type: AuthType.BASIC as const,
          username: credentials.username,
          password: credentials.password,
        };

      case AuthType.JWT:
        return {
          type: AuthType.JWT as const,
          token: credentials.token,
          expiresAt: credentials.expiresAt,
          refreshToken: credentials.refreshToken,
        };

      default:
        throw createValidationError('Unsupported authentication type');
    }
  }

  /**
   * Create connector instance based on ERP type
   */
  private async createConnectorInstance(
    config: ConnectorConfig
  ): Promise<BaseConnector> {
    logger.debug(`[${config.id}] Creating connector instance for ${config.erpType}`);

    switch (config.erpType) {
      // REST API Connectors
      case ERPType.CUSTOM_REST:
      case ERPType.SALESFORCE:
      case ERPType.NETSUITE:
      case ERPType.QUICKBOOKS:
      case ERPType.WORKDAY:
        return new RESTConnector(config, {
          autoParseJSON: true,
          autoPaginate: false,
          arrayFormat: 'bracket',
        });

      // OData Connectors
      case ERPType.CUSTOM_ODATA:
      case ERPType.SAP:
      case ERPType.MICROSOFT_DYNAMICS:
        // Determine OData version (v4 by default, v2 for older SAP systems)
        const odataVersion =
          config.erpType === ERPType.SAP
            ? ODataVersion.V2 // SAP often uses v2
            : ODataVersion.V4; // Modern systems use v4

        const odataConfig: ODataConnectorConfig = {
          ...config,
          version: odataVersion,
          serviceRoot: config.baseUrl,
          csrf: config.erpType === ERPType.SAP, // Enable CSRF for SAP
          useBatch: false,
          maxBatchSize: 50,
        };

        return new ODataConnector(odataConfig);

      // Other ERP types (default to REST)
      case ERPType.ORACLE:
      case ERPType.SAGE:
      case ERPType.SUCCESSFACTORS:
        return new RESTConnector(config, {
          autoParseJSON: true,
          autoPaginate: false,
          arrayFormat: 'bracket',
        });

      default:
        throw createValidationError(
          `Unsupported ERP type: ${config.erpType}. ` +
          `Supported types: ${Object.values(ERPType).join(', ')}`
        );
    }
  }
}

// Export singleton instance
export const connectorService = new ConnectorService();

