/**
 * REST Connector Types
 * Type definitions for REST API connector
 */

/**
 * REST request method types
 */
export type RESTMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * REST request options
 */
export interface RESTRequestOptions {
  path: string;
  method?: RESTMethod;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * REST response interface
 */
export interface RESTResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Filter operator types
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'nin',
  LIKE = 'like',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

/**
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Query builder options
 */
export interface QueryBuilderOptions {
  filters?: FilterCondition[];
  pagination?: PaginationOptions;
  fields?: string[]; // Select specific fields
  expand?: string[]; // Expand nested resources
  search?: string; // General search term
}

/**
 * Batch request item
 */
export interface BatchRequestItem {
  id: string;
  method: RESTMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Batch response item
 */
export interface BatchResponseItem<T = unknown> {
  id: string;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * REST connector configuration
 */
export interface RESTConnectorConfig {
  /**
   * Default headers to include in all requests
   */
  defaultHeaders?: Record<string, string>;

  /**
   * Query parameter style
   * - 'bracket': foo[]=1&foo[]=2
   * - 'comma': foo=1,2
   * - 'repeat': foo=1&foo=2
   */
  arrayFormat?: 'bracket' | 'comma' | 'repeat';

  /**
   * Enable automatic JSON parsing
   */
  autoParseJSON?: boolean;

  /**
   * Enable automatic pagination
   */
  autoPaginate?: boolean;

  /**
   * Maximum number of pages to fetch (for autoPaginate)
   */
  maxPages?: number;
}

