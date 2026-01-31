/**
 * OData Connector
 * Implements OData v2 and v4 protocol support
 * Compatible with SAP and other enterprise systems
 */

import { BaseConnector } from '../base/BaseConnector';
import { ODataQueryBuilder } from './ODataQueryBuilder';
import { ODataMetadataParser } from './ODataMetadataParser';
import { logger } from '../../config/logger';
import {
  ODataVersion,
  ODataConnectorConfig,
  ODataQueryOptions,
  ODataResponse,
  ODataServiceMetadata,
  ODataCSRFToken,
  ODataBatchRequestItem,
  ODataBatchResponseItem,
  ODataFunctionCallOptions,
  ODataRequestOptions,
} from './types';
// ConnectorError types available if needed
// import { ConnectionError } from '../errors/ConnectorError';

export class ODataConnector extends BaseConnector {
  protected version: ODataVersion;
  protected serviceRoot: string;
  protected csrfToken?: ODataCSRFToken;
  protected metadata?: ODataServiceMetadata;
  protected useBatch: boolean;
  protected maxBatchSize: number;
  protected metadataParser: ODataMetadataParser;

  constructor(config: ODataConnectorConfig) {
    super(config);
    this.version = config.version;
    this.serviceRoot = config.serviceRoot || config.baseUrl;
    this.useBatch = config.useBatch ?? false;
    this.maxBatchSize = config.maxBatchSize || 50;
    this.metadataParser = new ODataMetadataParser(this.version);
  }


  /**
   * Fetch CSRF token (required for SAP systems)
   */
  private async fetchCSRFToken(): Promise<void> {
    try {
      logger.debug(`[${this.config.id}] Fetching CSRF token`);

      const response = await this.httpClient.get('/', {
        headers: {
          'X-CSRF-Token': 'Fetch',
        },
        validateStatus: (status: number) => status >= 200 && status < 400,
      });

      const token = response.headers['x-csrf-token'];
      if (token) {
        this.csrfToken = {
          token,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };
        logger.debug(`[${this.config.id}] CSRF token fetched successfully`);
      }
    } catch (error) {
      logger.warn(`[${this.config.id}] Failed to fetch CSRF token: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - some services don't require CSRF
    }
  }

  /**
   * Get CSRF token headers
   */
  private getCSRFHeaders(): Record<string, string> {
    if (!this.csrfToken) {
      return {};
    }

    // Check if token is expired
    if (
      this.csrfToken.expiresAt &&
      this.csrfToken.expiresAt < new Date()
    ) {
      logger.debug(`[${this.config.id}] CSRF token expired`);
      return {};
    }

    return {
      'X-CSRF-Token': this.csrfToken.token,
    };
  }

  /**
   * Fetch service metadata
   */
  private async fetchMetadata(): Promise<void> {
    try {
      logger.debug(`[${this.config.id}] Fetching service metadata`);

      const response = await this.httpClient.get<string>('/$metadata', {
        headers: {
          Accept: 'application/xml',
        },
      });

      // Parse metadata (simplified - in production, use a proper XML parser)
      this.metadata = this.parseMetadata(response.data);
      logger.debug(`[${this.config.id}] Metadata fetched successfully`);
    } catch (error) {
      logger.warn(`[${this.config.id}] Failed to fetch metadata: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - connector can work without metadata
    }
  }

  /**
   * Parse service metadata
   * Uses fast-xml-parser for proper XML parsing
   */
  private parseMetadata(xmlData: string): ODataServiceMetadata {
    try {
      return this.metadataParser.parse(xmlData);
    } catch (error) {
      logger.error(`[${this.config.id}] Failed to parse metadata:`, error);
      return {
        version: this.version,
        entityTypes: [],
        entitySets: [],
      };
    }
  }

  /**
   * Query entity set
   */
  async query<T = any>(
    entitySet: string,
    options?: ODataQueryOptions,
    requestOptions?: ODataRequestOptions
  ): Promise<ODataResponse<T>> {
    await this.ensureConnected();

    const queryBuilder = new ODataQueryBuilder(this.version);
    if (options) {
      queryBuilder.fromOptions(options);
    }

    const queryString = queryBuilder.build();
    const url = queryString
      ? `/${entitySet}?${queryString}`
      : `/${entitySet}`;

    logger.debug(`[${this.config.id}] Querying: ${url}`);

    const response = await this.httpClient.get<ODataResponse<T>>(url, {
      headers: this.getODataHeaders(requestOptions?.headers),
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Get single entity by key
   */
  async getEntity<T = any>(
    entitySet: string,
    key: string | number | Record<string, any>,
    options?: ODataQueryOptions,
    requestOptions?: ODataRequestOptions
  ): Promise<T> {
    await this.ensureConnected();

    const keyString = this.formatKey(key);
    const queryBuilder = new ODataQueryBuilder(this.version);
    if (options) {
      queryBuilder.fromOptions(options);
    }

    const queryString = queryBuilder.build();
    const url = queryString
      ? `/${entitySet}(${keyString})?${queryString}`
      : `/${entitySet}(${keyString})`;

    logger.debug(`[${this.config.id}] Getting entity: ${url}`);

    const response = await this.httpClient.get<T>(url, {
      headers: this.getODataHeaders(requestOptions?.headers),
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Create entity
   */
  async createEntity<T = any>(
    entitySet: string,
    data: any,
    requestOptions?: ODataRequestOptions
  ): Promise<T> {
    await this.ensureConnected();

    // Refresh CSRF token if needed
    if ((this.config as ODataConnectorConfig).csrf) {
      await this.ensureCSRFToken();
    }

    logger.debug(`[${this.config.id}] Creating entity in: ${entitySet}`);

    const response = await this.httpClient.post<T>(`/${entitySet}`, data, {
      headers: {
        ...this.getODataHeaders(requestOptions?.headers),
        ...this.getCSRFHeaders(),
      },
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Update entity (PUT - full replace)
   */
  async updateEntity<T = any>(
    entitySet: string,
    key: string | number | Record<string, any>,
    data: any,
    requestOptions?: ODataRequestOptions
  ): Promise<T> {
    await this.ensureConnected();

    if ((this.config as ODataConnectorConfig).csrf) {
      await this.ensureCSRFToken();
    }

    const keyString = this.formatKey(key);
    const url = `/${entitySet}(${keyString})`;

    logger.debug(`[${this.config.id}] Updating entity: ${url}`);

    const response = await this.httpClient.put<T>(url, data, {
      headers: {
        ...this.getODataHeaders(requestOptions?.headers),
        ...this.getCSRFHeaders(),
      },
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Patch entity (PATCH - partial update)
   */
  async patchEntity<T = any>(
    entitySet: string,
    key: string | number | Record<string, any>,
    data: Partial<any>,
    requestOptions?: ODataRequestOptions
  ): Promise<T> {
    await this.ensureConnected();

    if ((this.config as ODataConnectorConfig).csrf) {
      await this.ensureCSRFToken();
    }

    const keyString = this.formatKey(key);
    const url = `/${entitySet}(${keyString})`;

    logger.debug(`[${this.config.id}] Patching entity: ${url}`);

    const response = await this.httpClient.patch<T>(url, data, {
      headers: {
        ...this.getODataHeaders(requestOptions?.headers),
        ...this.getCSRFHeaders(),
      },
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Delete entity
   */
  async deleteEntity(
    entitySet: string,
    key: string | number | Record<string, any>,
    requestOptions?: ODataRequestOptions
  ): Promise<void> {
    await this.ensureConnected();

    if ((this.config as ODataConnectorConfig).csrf) {
      await this.ensureCSRFToken();
    }

    const keyString = this.formatKey(key);
    const url = `/${entitySet}(${keyString})`;

    logger.debug(`[${this.config.id}] Deleting entity: ${url}`);

    await this.httpClient.delete(url, {
      headers: {
        ...this.getODataHeaders(requestOptions?.headers),
        ...this.getCSRFHeaders(),
      },
      timeout: requestOptions?.timeout,
    });
  }

  /**
   * Get count of entities
   */
  async count(
    entitySet: string,
    filter?: string | ODataQueryOptions,
    requestOptions?: ODataRequestOptions
  ): Promise<number> {
    await this.ensureConnected();

    let url = `/${entitySet}/$count`;

    if (filter) {
      const queryBuilder = new ODataQueryBuilder(this.version);
      if (typeof filter === 'string') {
        queryBuilder.filter(filter);
      } else if (filter.$filter) {
        queryBuilder.filter(filter.$filter);
      }
      const queryString = queryBuilder.build();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    logger.debug(`[${this.config.id}] Getting count: ${url}`);

    const response = await this.httpClient.get<number | string>(url, {
      headers: this.getODataHeaders(requestOptions?.headers),
      timeout: requestOptions?.timeout,
    });

    // Response might be number or string
    if (typeof response.data === 'number') {
      return response.data;
    }
    return parseInt(String(response.data), 10);
  }

  /**
   * Call OData function
   */
  async callFunction<T = any>(
    functionName: string,
    options?: ODataFunctionCallOptions,
    requestOptions?: ODataRequestOptions
  ): Promise<T> {
    await this.ensureConnected();

    let url = `/${functionName}`;

    // Add parameters
    if (options?.parameters) {
      const params = Object.entries(options.parameters)
        .map(([key, value]) => {
          const formattedValue =
            typeof value === 'string' ? `'${value}'` : value;
          return `${key}=${formattedValue}`;
        })
        .join(',');
      url += `(${params})`;
    }

    logger.debug(`[${this.config.id}] Calling function: ${url}`);

    const response = await this.httpClient.get<T>(url, {
      headers: this.getODataHeaders({
        ...requestOptions?.headers,
        ...options?.headers,
      }),
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Call OData action
   */
  async callAction<T = any>(
    actionName: string,
    data?: any,
    options?: ODataFunctionCallOptions,
    requestOptions?: ODataRequestOptions
  ): Promise<T> {
    await this.ensureConnected();

    if ((this.config as ODataConnectorConfig).csrf) {
      await this.ensureCSRFToken();
    }

    const url = `/${actionName}`;

    logger.debug(`[${this.config.id}] Calling action: ${url}`);

    const response = await this.httpClient.post<T>(url, data || {}, {
      headers: {
        ...this.getODataHeaders({
          ...requestOptions?.headers,
          ...options?.headers,
        }),
        ...this.getCSRFHeaders(),
      },
      timeout: requestOptions?.timeout,
    });

    return response.data;
  }

  /**
   * Execute batch request
   */
  async batch(
    requests: ODataBatchRequestItem[]
  ): Promise<ODataBatchResponseItem[]> {
    await this.ensureConnected();

    if ((this.config as ODataConnectorConfig).csrf) {
      await this.ensureCSRFToken();
    }

    logger.debug(`[${this.config.id}] Executing batch with ${requests.length} requests`);

    const batchId = `batch_${Date.now()}`;
    const changesetId = `changeset_${Date.now()}`;

    // Build batch request body
    const batchBody = this.buildBatchBody(requests, batchId, changesetId);

    const response = await this.httpClient.post<string>('/$batch', batchBody, {
      headers: {
        'Content-Type': `multipart/mixed; boundary=${batchId}`,
        ...this.getCSRFHeaders(),
      },
    });

    // Parse batch response
    return this.parseBatchResponse(response.data);
  }

  /**
   * Build batch request body
   */
  private buildBatchBody(
    requests: ODataBatchRequestItem[],
    batchId: string,
    changesetId: string
  ): string {
    const lines: string[] = [];

    // Separate read and write requests
    const readRequests = requests.filter((r) => r.method === 'GET');
    const writeRequests = requests.filter((r) => r.method !== 'GET');

    // Add read requests
    readRequests.forEach((req) => {
      lines.push(`--${batchId}`);
      lines.push('Content-Type: application/http');
      lines.push('Content-Transfer-Encoding: binary');
      lines.push('');
      lines.push(`${req.method} ${req.url} HTTP/1.1`);

      if (req.headers) {
        Object.entries(req.headers).forEach(([key, value]) => {
          lines.push(`${key}: ${value}`);
        });
      }

      lines.push('');
    });

    // Add write requests in a changeset
    if (writeRequests.length > 0) {
      lines.push(`--${batchId}`);
      lines.push(`Content-Type: multipart/mixed; boundary=${changesetId}`);
      lines.push('');

      writeRequests.forEach((req, index) => {
        lines.push(`--${changesetId}`);
        lines.push('Content-Type: application/http');
        lines.push('Content-Transfer-Encoding: binary');

        if (req.id) {
          lines.push(`Content-ID: ${req.id}`);
        } else {
          lines.push(`Content-ID: ${index + 1}`);
        }

        lines.push('');
        lines.push(`${req.method} ${req.url} HTTP/1.1`);

        if (req.headers) {
          Object.entries(req.headers).forEach(([key, value]) => {
            lines.push(`${key}: ${value}`);
          });
        }

        if (req.body) {
          const bodyStr = JSON.stringify(req.body);
          lines.push('Content-Type: application/json');
          lines.push(`Content-Length: ${bodyStr.length}`);
          lines.push('');
          lines.push(bodyStr);
        }

        lines.push('');
      });

      lines.push(`--${changesetId}--`);
    }

    lines.push(`--${batchId}--`);

    return lines.join('\r\n');
  }

  /**
   * Parse batch response
   * Note: Simplified implementation
   */
  private parseBatchResponse(_responseBody: string): ODataBatchResponseItem[] {
    // TODO: Implement proper batch response parsing
    // This is a complex task that requires parsing multipart/mixed responses
    return [];
  }

  /**
   * Get all data with automatic pagination
   */
  async getAll<T = any>(
    entitySet: string,
    options?: ODataQueryOptions,
    requestOptions?: ODataRequestOptions
  ): Promise<T[]> {
    await this.ensureConnected();

    const allData: T[] = [];
    let nextLink: string | undefined;
    let hasMore = true;

    while (hasMore) {
      let response: ODataResponse<T>;

      if (nextLink) {
        // Follow next link
        const url = nextLink.replace(this.serviceRoot, '');
        const httpResponse = await this.httpClient.get<ODataResponse<T>>(url, {
          headers: this.getODataHeaders(requestOptions?.headers),
        });
        response = httpResponse.data;
      } else {
        // Initial request
        response = await this.query<T>(entitySet, options, requestOptions);
      }

      // Extract data
      const data = response.value || (Array.isArray(response) ? response : [response]);
      allData.push(...(data as T[]));

      // Check for next link
      nextLink = response['@odata.nextLink'];
      hasMore = !!nextLink;

      logger.debug(
        `[${this.config.id}] Fetched ${data.length} records, total: ${allData.length}`
      );
    }

    return allData;
  }

  /**
   * Format entity key
   */
  private formatKey(key: string | number | Record<string, any>): string {
    if (typeof key === 'string') {
      return `'${key}'`;
    }
    if (typeof key === 'number') {
      return key.toString();
    }
    // Composite key
    return Object.entries(key)
      .map(([k, v]) => {
        const value = typeof v === 'string' ? `'${v}'` : v;
        return `${k}=${value}`;
      })
      .join(',');
  }

  /**
   * Get OData-specific headers
   */
  private getODataHeaders(
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // Add OData version header
    if (this.version === ODataVersion.V4) {
      headers['OData-Version'] = '4.0';
      headers['OData-MaxVersion'] = '4.0';
    } else {
      headers['DataServiceVersion'] = '2.0';
      headers['MaxDataServiceVersion'] = '2.0';
    }

    // Merge custom headers
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Ensure CSRF token is valid
   */
  private async ensureCSRFToken(): Promise<void> {
    if (!this.csrfToken || (this.csrfToken.expiresAt && this.csrfToken.expiresAt < new Date())) {
      await this.fetchCSRFToken();
    }
  }

  /**
   * Test connection (override from BaseConnector)
   */
  protected getHealthCheckPath(): string {
    return '/$metadata';
  }

  /**
   * Custom initialization logic
   */
  protected async onConnect(): Promise<void> {
    // Fetch CSRF token if required
    if ((this.config as ODataConnectorConfig).csrf) {
      await this.fetchCSRFToken();
    }

    // Fetch metadata
    await this.fetchMetadata();
  }

  /**
   * Custom cleanup logic
   */
  protected async onDisconnect(): Promise<void> {
    // Clear CSRF token and metadata
    this.csrfToken = undefined;
    this.metadata = undefined;
  }

  /**
   * Create a query builder instance
   */
  createQueryBuilder(): ODataQueryBuilder {
    return new ODataQueryBuilder(this.version);
  }
}

