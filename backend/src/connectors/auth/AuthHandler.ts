/**
 * Authentication Handler
 * Manages authentication for different auth types
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';
import {
  ConnectorCredentials,
  OAuth2Credentials,
  ApiKeyCredentials,
  BasicAuthCredentials,
  JWTCredentials,
} from '../types/connector.types';
import { AuthenticationError } from '../errors/ConnectorError';
import { AuthType } from '../../types';

/**
 * Base Authentication Handler Interface
 */
export interface IAuthHandler {
  authenticate(client: AxiosInstance): Promise<void>;
  isTokenExpired(): boolean;
  refreshToken?(): Promise<void>;
  getAuthHeaders(): Record<string, string>;
}

/**
 * OAuth 2.0 Authentication Handler
 */
export class OAuth2Handler implements IAuthHandler {
  private credentials: OAuth2Credentials;
  private connectorId: string;

  constructor(credentials: OAuth2Credentials, connectorId: string) {
    this.credentials = credentials;
    this.connectorId = connectorId;
  }

  async authenticate(client: AxiosInstance): Promise<void> {
    try {
      // Check if token is valid
      if (this.credentials.accessToken && !this.isTokenExpired()) {
        logger.debug(`[${this.connectorId}] Using existing access token`);
        return;
      }

      // Try to refresh token if available
      if (this.credentials.refreshToken) {
        await this.refreshToken();
        return;
      }

      // Get new access token
      logger.info(`[${this.connectorId}] Obtaining OAuth2 access token`);

      const response = await client.post(this.credentials.tokenUrl, {
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: this.credentials.scope,
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token;

      // Calculate expiration time (default 1 hour if not provided)
      const expiresIn = response.data.expires_in || 3600;
      this.credentials.expiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info(`[${this.connectorId}] OAuth2 authentication successful`);
    } catch (error) {
      logger.error(`[${this.connectorId}] OAuth2 authentication failed:`, error);
      throw AuthenticationError.invalidCredentials(this.connectorId);
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.credentials.refreshToken) {
      throw AuthenticationError.tokenRefreshFailed(this.connectorId);
    }

    try {
      logger.info(`[${this.connectorId}] Refreshing OAuth2 access token`);

      const client = axios.create();
      const response = await client.post(this.credentials.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken =
        response.data.refresh_token || this.credentials.refreshToken;

      const expiresIn = response.data.expires_in || 3600;
      this.credentials.expiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info(`[${this.connectorId}] Token refresh successful`);
    } catch (error) {
      logger.error(`[${this.connectorId}] Token refresh failed:`, error);
      throw AuthenticationError.tokenRefreshFailed(this.connectorId);
    }
  }

  isTokenExpired(): boolean {
    if (!this.credentials.expiresAt) {
      return true;
    }
    // Add 5-minute buffer for token expiration
    const bufferMs = 5 * 60 * 1000;
    return Date.now() + bufferMs >= this.credentials.expiresAt.getTime();
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.credentials.accessToken) {
      throw AuthenticationError.tokenExpired(this.connectorId);
    }
    return {
      Authorization: `Bearer ${this.credentials.accessToken}`,
    };
  }
}

/**
 * API Key Authentication Handler
 */
export class ApiKeyHandler implements IAuthHandler {
  private credentials: ApiKeyCredentials;
  private connectorId: string;

  constructor(credentials: ApiKeyCredentials, connectorId: string) {
    this.credentials = credentials;
    this.connectorId = connectorId;
  }

  async authenticate(_client: AxiosInstance): Promise<void> {
    // API key doesn't need initialization
    logger.debug(`[${this.connectorId}] API Key authentication configured`);
  }

  isTokenExpired(): boolean {
    return false; // API keys don't expire (handled by external systems)
  }

  getAuthHeaders(): Record<string, string> {
    const headerName = this.credentials.headerName || 'X-API-Key';
    const prefix = this.credentials.prefix || '';
    return {
      [headerName]: `${prefix}${this.credentials.apiKey}`,
    };
  }
}

/**
 * Basic Authentication Handler
 */
export class BasicAuthHandler implements IAuthHandler {
  private credentials: BasicAuthCredentials;
  private connectorId: string;

  constructor(credentials: BasicAuthCredentials, connectorId: string) {
    this.credentials = credentials;
    this.connectorId = connectorId;
  }

  async authenticate(_client: AxiosInstance): Promise<void> {
    logger.debug(`[${this.connectorId}] Basic authentication configured`);
  }

  isTokenExpired(): boolean {
    return false; // Basic auth doesn't expire
  }

  getAuthHeaders(): Record<string, string> {
    const token = Buffer.from(
      `${this.credentials.username}:${this.credentials.password}`
    ).toString('base64');
    return {
      Authorization: `Basic ${token}`,
    };
  }
}

/**
 * JWT Authentication Handler
 */
export class JWTHandler implements IAuthHandler {
  private credentials: JWTCredentials;
  private connectorId: string;

  constructor(credentials: JWTCredentials, connectorId: string) {
    this.credentials = credentials;
    this.connectorId = connectorId;
  }

  async authenticate(_client: AxiosInstance): Promise<void> {
    logger.debug(`[${this.connectorId}] JWT authentication configured`);
  }

  isTokenExpired(): boolean {
    if (!this.credentials.expiresAt) {
      return false; // Assume valid if no expiry
    }
    const bufferMs = 5 * 60 * 1000; // 5-minute buffer
    return Date.now() + bufferMs >= this.credentials.expiresAt.getTime();
  }

  getAuthHeaders(): Record<string, string> {
    if (this.isTokenExpired()) {
      throw AuthenticationError.tokenExpired(this.connectorId);
    }
    return {
      Authorization: `Bearer ${this.credentials.token}`,
    };
  }
}

/**
 * Authentication Handler Factory
 */
export class AuthHandlerFactory {
  static create(
    credentials: ConnectorCredentials,
    connectorId: string
  ): IAuthHandler {
    switch (credentials.type) {
      case AuthType.OAUTH2:
        return new OAuth2Handler(credentials, connectorId);
      case AuthType.API_KEY:
        return new ApiKeyHandler(credentials, connectorId);
      case AuthType.BASIC:
        return new BasicAuthHandler(credentials, connectorId);
      case AuthType.JWT:
        return new JWTHandler(credentials, connectorId);
      default:
        throw AuthenticationError.unsupportedAuthType(
          (credentials as { type: string }).type
        );
    }
  }
}

