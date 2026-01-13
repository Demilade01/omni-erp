/**
 * Query Builder
 * Builds URL query parameters from structured options
 */

import {
  QueryBuilderOptions,
  FilterCondition,
  FilterOperator,
  PaginationOptions,
} from './types';

/**
 * Query Builder Class
 */
export class QueryBuilder {
  private options: QueryBuilderOptions;
  private arrayFormat: 'bracket' | 'comma' | 'repeat';

  constructor(
    options: QueryBuilderOptions = {},
    arrayFormat: 'bracket' | 'comma' | 'repeat' = 'bracket'
  ) {
    this.options = options;
    this.arrayFormat = arrayFormat;
  }

  /**
   * Build query parameters from options
   */
  build(): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Add filters
    if (this.options.filters && this.options.filters.length > 0) {
      this.addFilters(params, this.options.filters);
    }

    // Add pagination
    if (this.options.pagination) {
      this.addPagination(params, this.options.pagination);
    }

    // Add field selection
    if (this.options.fields && this.options.fields.length > 0) {
      this.addFields(params, this.options.fields);
    }

    // Add expand/include
    if (this.options.expand && this.options.expand.length > 0) {
      this.addExpand(params, this.options.expand);
    }

    // Add search
    if (this.options.search) {
      params.search = this.options.search;
      params.q = this.options.search; // Common alias
    }

    return params;
  }

  /**
   * Build URL with query parameters
   */
  buildUrl(baseUrl: string, path: string): string {
    const params = this.build();
    const queryString = this.serializeParams(params);

    const url = new URL(path, baseUrl);
    if (queryString) {
      url.search = queryString;
    }

    return url.toString();
  }

  /**
   * Add filters to query params
   */
  private addFilters(
    params: Record<string, unknown>,
    filters: FilterCondition[]
  ): void {
    filters.forEach((filter, index) => {
      const { field, operator, value } = filter;

      // Different strategies for filter formatting
      switch (operator) {
        case FilterOperator.EQUALS:
          params[field] = value;
          break;

        case FilterOperator.NOT_EQUALS:
          params[`${field}[ne]`] = value;
          break;

        case FilterOperator.GREATER_THAN:
          params[`${field}[gt]`] = value;
          break;

        case FilterOperator.GREATER_THAN_OR_EQUAL:
          params[`${field}[gte]`] = value;
          break;

        case FilterOperator.LESS_THAN:
          params[`${field}[lt]`] = value;
          break;

        case FilterOperator.LESS_THAN_OR_EQUAL:
          params[`${field}[lte]`] = value;
          break;

        case FilterOperator.IN:
          params[`${field}[in]`] = Array.isArray(value)
            ? this.formatArray(value)
            : value;
          break;

        case FilterOperator.NOT_IN:
          params[`${field}[nin]`] = Array.isArray(value)
            ? this.formatArray(value)
            : value;
          break;

        case FilterOperator.LIKE:
        case FilterOperator.CONTAINS:
          params[`${field}[like]`] = value;
          break;

        case FilterOperator.STARTS_WITH:
          params[`${field}[startsWith]`] = value;
          break;

        case FilterOperator.ENDS_WITH:
          params[`${field}[endsWith]`] = value;
          break;

        default:
          // Fallback: use filter array notation
          params[`filter[${index}][field]`] = field;
          params[`filter[${index}][operator]`] = operator;
          params[`filter[${index}][value]`] = value;
      }
    });
  }

  /**
   * Add pagination to query params
   */
  private addPagination(
    params: Record<string, unknown>,
    pagination: PaginationOptions
  ): void {
    if (pagination.page !== undefined) {
      params.page = pagination.page;
    }

    if (pagination.limit !== undefined) {
      params.limit = pagination.limit;
      params.per_page = pagination.limit; // Common alias
    }

    if (pagination.offset !== undefined) {
      params.offset = pagination.offset;
    }

    if (pagination.sort) {
      const sortValue =
        pagination.order === 'desc'
          ? `-${pagination.sort}`
          : pagination.sort;
      params.sort = sortValue;
      params.order_by = sortValue; // Common alias
    }
  }

  /**
   * Add field selection to query params
   */
  private addFields(
    params: Record<string, unknown>,
    fields: string[]
  ): void {
    params.fields = this.formatArray(fields);
    params.select = this.formatArray(fields); // Common alias
  }

  /**
   * Add expand/include to query params
   */
  private addExpand(
    params: Record<string, unknown>,
    expand: string[]
  ): void {
    params.expand = this.formatArray(expand);
    params.include = this.formatArray(expand); // Common alias
  }

  /**
   * Format array based on arrayFormat setting
   */
  private formatArray(arr: unknown[]): string | unknown[] {
    switch (this.arrayFormat) {
      case 'comma':
        return arr.join(',');
      case 'repeat':
      case 'bracket':
      default:
        return arr;
    }
  }

  /**
   * Serialize params to query string
   */
  private serializeParams(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        // Handle array based on format
        if (this.arrayFormat === 'bracket') {
          value.forEach((item) => {
            searchParams.append(`${key}[]`, String(item));
          });
        } else if (this.arrayFormat === 'repeat') {
          value.forEach((item) => {
            searchParams.append(key, String(item));
          });
        } else {
          // comma format (already handled in formatArray)
          searchParams.append(key, String(value));
        }
      } else if (typeof value === 'object') {
        // Serialize nested objects
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    });

    return searchParams.toString();
  }

  /**
   * Add custom parameter
   */
  addParam(key: string, value: unknown): QueryBuilder {
    const params = this.build();
    params[key] = value;
    return new QueryBuilder(
      { ...this.options, ...params },
      this.arrayFormat
    );
  }

  /**
   * Reset query builder
   */
  reset(): QueryBuilder {
    return new QueryBuilder({}, this.arrayFormat);
  }
}

