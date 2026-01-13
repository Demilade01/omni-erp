/**
 * REST Connector
 * Generic REST API connector implementation
 */

import { BaseConnector } from '../base/BaseConnector';
import { QueryBuilder } from './QueryBuilder';
import { logger } from '../../config/logger';
import {
  RESTRequestOptions,
  RESTResponse,
  RESTConnectorConfig,
  QueryBuilderOptions,
  BatchRequestItem,
  BatchResponseItem,
} from './types';
import { ConnectorConfig } from '../types/connector.types';

/**
 * REST Connector Class
 */
export class RESTConnector extends BaseConnector {
  private restConfig: RESTConnectorConfig;

  constructor(config: ConnectorConfig, restConfig: RESTConnectorConfig = {}) {
    super(config);
    this.restConfig = {
      autoParseJSON: true,
      autoPaginate: false,
      maxPages: 10,
      arrayFormat: 'bracket',
      ...restConfig,
    };

    logger.info(`[${config.id}] REST Connector initialized`);
  }

  /**
   * GET request
   */
  async getData<T = unknown>(
    path: string,
    queryOptions?: QueryBuilderOptions
  ): Promise<RESTResponse<T>> {
    try {
      // Build query parameters
      let queryParams: Record<string, unknown> = {};
      if (queryOptions) {
        const queryBuilder = new QueryBuilder(
          queryOptions,
          this.restConfig.arrayFormat
        );
        queryParams = queryBuilder.build();
      }

      logger.debug(`[${this.config.id}] GET ${path}`, { queryParams });

      const response = await this.get<T>(path, queryParams);

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
    } catch (error) {
      logger.error(`[${this.config.id}] GET ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * POST request (Create)
   */
  async createData<T = unknown>(
    path: string,
    data: unknown,
    _options?: Partial<RESTRequestOptions>
  ): Promise<RESTResponse<T>> {
    try {
      logger.debug(`[${this.config.id}] POST ${path}`, { data });

      const response = await this.post<T>(path, data);

      return {
        data: response,
        status: 201,
        statusText: 'Created',
        headers: {},
      };
    } catch (error) {
      logger.error(`[${this.config.id}] POST ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * PUT request (Full Update)
   */
  async updateData<T = unknown>(
    path: string,
    data: unknown,
    _options?: Partial<RESTRequestOptions>
  ): Promise<RESTResponse<T>> {
    try {
      logger.debug(`[${this.config.id}] PUT ${path}`, { data });

      const response = await this.put<T>(path, data);

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
    } catch (error) {
      logger.error(`[${this.config.id}] PUT ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * PATCH request (Partial Update)
   */
  async patchData<T = unknown>(
    path: string,
    data: unknown,
    _options?: Partial<RESTRequestOptions>
  ): Promise<RESTResponse<T>> {
    try {
      logger.debug(`[${this.config.id}] PATCH ${path}`, { data });

      const response = await this.patch<T>(path, data);

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
    } catch (error) {
      logger.error(`[${this.config.id}] PATCH ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async deleteData<T = unknown>(
    path: string,
    _options?: Partial<RESTRequestOptions>
  ): Promise<RESTResponse<T>> {
    try {
      logger.debug(`[${this.config.id}] DELETE ${path}`);

      const response = await this.delete<T>(path);

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
    } catch (error) {
      logger.error(`[${this.config.id}] DELETE ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * Generic request method
   */
  async makeRequest<T = unknown>(
    options: RESTRequestOptions
  ): Promise<RESTResponse<T>> {
    const { path, method = 'GET', query, body } = options;

    try {
      logger.debug(`[${this.config.id}] ${method} ${path}`, {
        query,
        body,
      });

      let response: T;

      switch (method) {
        case 'GET':
          response = await this.get<T>(path, query);
          break;
        case 'POST':
          response = await this.post<T>(path, body);
          break;
        case 'PUT':
          response = await this.put<T>(path, body);
          break;
        case 'PATCH':
          response = await this.patch<T>(path, body);
          break;
        case 'DELETE':
          response = await this.delete<T>(path);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
    } catch (error) {
      logger.error(`[${this.config.id}] ${method} ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * Batch requests
   */
  async batchRequest<T = unknown>(
    items: BatchRequestItem[]
  ): Promise<BatchResponseItem<T>[]> {
    logger.info(`[${this.config.id}] Executing batch request with ${items.length} items`);

    const results = await Promise.allSettled(
      items.map(async (item) => {
        try {
          const response = await this.makeRequest<T>({
            path: item.path,
            method: item.method,
            body: item.body,
            headers: item.headers,
          });

          return {
            id: item.id,
            status: response.status,
            data: response.data,
          };
        } catch (error) {
          return {
            id: item.id,
            status: 500,
            error: {
              code: 'REQUEST_FAILED',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: items[index].id,
          status: 500,
          error: {
            code: 'BATCH_ITEM_FAILED',
            message: result.reason?.message || 'Unknown error',
          },
        };
      }
    });
  }

  /**
   * Paginated GET request (auto-fetch all pages)
   */
  async getAllData<T = unknown>(
    path: string,
    queryOptions?: QueryBuilderOptions
  ): Promise<T[]> {
    if (!this.restConfig.autoPaginate) {
      const response = await this.getData<T[]>(path, queryOptions);
      return Array.isArray(response.data) ? response.data : [response.data];
    }

    logger.info(`[${this.config.id}] Fetching all pages from ${path}`);

    const allData: T[] = [];
    let currentPage = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.limit || 20;
    const maxPages = this.restConfig.maxPages || 10;

    for (let i = 0; i < maxPages; i++) {
      const pageOptions: QueryBuilderOptions = {
        ...queryOptions,
        pagination: {
          ...queryOptions?.pagination,
          page: currentPage,
          limit,
        },
      };

      const response = await this.getData<T[] | { data: T[] }>(
        path,
        pageOptions
      );

      // Handle different response formats
      let pageData: T[];
      if (Array.isArray(response.data)) {
        pageData = response.data;
      } else if (
        typeof response.data === 'object' &&
        response.data !== null &&
        'data' in response.data
      ) {
        pageData = (response.data as { data: T[] }).data;
      } else {
        pageData = [response.data as T];
      }

      allData.push(...pageData);

      // Stop if we got less than the limit (last page)
      if (pageData.length < limit) {
        break;
      }

      currentPage++;
    }

    logger.info(
      `[${this.config.id}] Fetched ${allData.length} items from ${currentPage} pages`
    );

    return allData;
  }

  /**
   * Create query builder instance
   */
  createQueryBuilder(options?: QueryBuilderOptions): QueryBuilder {
    return new QueryBuilder(options, this.restConfig.arrayFormat);
  }

  /**
   * Get health check endpoint path
   */
  protected getHealthCheckPath(): string {
    return '/health';
  }

  /**
   * Custom connect logic (can be overridden)
   */
  protected async onConnect(): Promise<void> {
    logger.debug(`[${this.config.id}] REST connector connected`);
  }

  /**
   * Custom disconnect logic (can be overridden)
   */
  protected async onDisconnect(): Promise<void> {
    logger.debug(`[${this.config.id}] REST connector disconnected`);
  }
}

