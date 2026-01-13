/**
 * OData Query Builder
 * Builds OData query strings with support for v2 and v4
 */

import {
  ODataVersion,
  ODataQueryOptions,
  ODataFilterCondition,
  ODataFilterGroup,
  ODataFilterOperator,
  ODataOrderBy,
  ODataExpandOptions,
} from './types';

export class ODataQueryBuilder {
  private version: ODataVersion;
  private queryParams: Map<string, string>;

  constructor(version: ODataVersion = ODataVersion.V4) {
    this.version = version;
    this.queryParams = new Map();
  }

  /**
   * Add $select clause
   */
  select(...fields: string[]): this {
    if (fields.length > 0) {
      this.queryParams.set('$select', fields.join(','));
    }
    return this;
  }

  /**
   * Add $expand clause
   */
  expand(
    value: string | string[] | ODataExpandOptions | ODataExpandOptions[]
  ): this {
    let expandString: string;

    if (typeof value === 'string') {
      expandString = value;
    } else if (Array.isArray(value)) {
      if (
        value.length > 0 &&
        typeof value[0] === 'object' &&
        'navigationProperty' in value[0]
      ) {
        // Array of ODataExpandOptions
        expandString = (value as ODataExpandOptions[])
          .map((opt) => this.buildExpandOption(opt))
          .join(',');
      } else {
        // Array of strings
        expandString = (value as string[]).join(',');
      }
    } else {
      // Single ODataExpandOptions
      expandString = this.buildExpandOption(value as ODataExpandOptions);
    }

    this.queryParams.set('$expand', expandString);
    return this;
  }

  /**
   * Build expand option string
   */
  private buildExpandOption(option: ODataExpandOptions): string {
    let expand = option.navigationProperty;

    const nestedOptions: string[] = [];

    if (option.select && option.select.length > 0) {
      nestedOptions.push(`$select=${option.select.join(',')}`);
    }

    if (option.filter) {
      const filterString =
        typeof option.filter === 'string'
          ? option.filter
          : this.buildFilterString(option.filter);
      nestedOptions.push(`$filter=${encodeURIComponent(filterString)}`);
    }

    if (option.orderby && option.orderby.length > 0) {
      nestedOptions.push(`$orderby=${this.buildOrderByString(option.orderby)}`);
    }

    if (option.top !== undefined) {
      nestedOptions.push(`$top=${option.top}`);
    }

    if (option.skip !== undefined) {
      nestedOptions.push(`$skip=${option.skip}`);
    }

    if (option.expand && option.expand.length > 0) {
      const nestedExpand = option.expand
        .map((exp) => this.buildExpandOption(exp))
        .join(',');
      nestedOptions.push(`$expand=${nestedExpand}`);
    }

    if (nestedOptions.length > 0) {
      expand += `(${nestedOptions.join(';')})`;
    }

    return expand;
  }

  /**
   * Add $filter clause
   */
  filter(
    condition: string | ODataFilterCondition | ODataFilterGroup
  ): this {
    const filterString =
      typeof condition === 'string'
        ? condition
        : this.buildFilterString(condition);

    this.queryParams.set('$filter', filterString);
    return this;
  }

  /**
   * Build filter string from condition or group
   */
  private buildFilterString(
    condition: ODataFilterCondition | ODataFilterGroup
  ): string {
    if ('logic' in condition) {
      // Filter group
      return this.buildFilterGroup(condition);
    } else {
      // Single condition
      return this.buildFilterCondition(condition);
    }
  }

  /**
   * Build single filter condition
   */
  private buildFilterCondition(condition: ODataFilterCondition): string {
    const { field, operator, value, negate } = condition;
    let filterStr: string;

    // Handle special operators
    switch (operator) {
      case ODataFilterOperator.CONTAINS:
        filterStr = `contains(${field},${this.formatValue(value)})`;
        break;

      case ODataFilterOperator.STARTSWITH:
        filterStr = `startswith(${field},${this.formatValue(value)})`;
        break;

      case ODataFilterOperator.ENDSWITH:
        filterStr = `endswith(${field},${this.formatValue(value)})`;
        break;

      case ODataFilterOperator.IN:
        if (this.version === ODataVersion.V4) {
          const values = Array.isArray(value) ? value : [value];
          filterStr = `${field} in (${values.map((v) => this.formatValue(v)).join(',')})`;
        } else {
          // v2 doesn't support 'in', use OR conditions
          const values = Array.isArray(value) ? value : [value];
          filterStr = values
            .map((v) => `${field} eq ${this.formatValue(v)}`)
            .join(' or ');
        }
        break;

      default:
        // Standard comparison operators
        filterStr = `${field} ${operator} ${this.formatValue(value)}`;
    }

    return negate ? `not (${filterStr})` : filterStr;
  }

  /**
   * Build filter group (AND/OR combinations)
   */
  private buildFilterGroup(group: ODataFilterGroup): string {
    const { logic, conditions } = group;

    const conditionStrings = conditions.map((cond) => {
      const str = this.buildFilterString(cond);
      // Wrap in parentheses if it's a group
      return 'logic' in cond ? `(${str})` : str;
    });

    return conditionStrings.join(` ${logic} `);
  }

  /**
   * Format value for OData query
   */
  private formatValue(value: any): string {
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'string') {
      // Escape single quotes
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (value instanceof Date) {
      if (this.version === ODataVersion.V2) {
        // v2 format: datetime'2023-01-15T10:30:00'
        return `datetime'${value.toISOString().split('.')[0]}'`;
      } else {
        // v4 format: 2023-01-15T10:30:00Z
        return value.toISOString();
      }
    }

    if (typeof value === 'object') {
      // For GUIDs or other special types
      return JSON.stringify(value);
    }

    return value.toString();
  }

  /**
   * Add $orderby clause
   */
  orderBy(field: string | ODataOrderBy[], direction?: 'asc' | 'desc'): this {
    let orderByString: string;

    if (typeof field === 'string') {
      orderByString = direction ? `${field} ${direction}` : field;
    } else {
      orderByString = this.buildOrderByString(field);
    }

    this.queryParams.set('$orderby', orderByString);
    return this;
  }

  /**
   * Build order by string
   */
  private buildOrderByString(orderBy: ODataOrderBy[]): string {
    return orderBy
      .map((order) => {
        return order.direction
          ? `${order.field} ${order.direction}`
          : order.field;
      })
      .join(',');
  }

  /**
   * Add $top clause (limit)
   */
  top(count: number): this {
    if (count > 0) {
      this.queryParams.set('$top', count.toString());
    }
    return this;
  }

  /**
   * Add $skip clause (offset)
   */
  skip(count: number): this {
    if (count >= 0) {
      this.queryParams.set('$skip', count.toString());
    }
    return this;
  }

  /**
   * Add $count clause (v4) or $inlinecount (v2)
   */
  count(include: boolean = true): this {
    if (this.version === ODataVersion.V4) {
      this.queryParams.set('$count', include.toString());
    } else {
      // v2 uses $inlinecount
      this.queryParams.set('$inlinecount', include ? 'allpages' : 'none');
    }
    return this;
  }

  /**
   * Add $search clause (v4 only)
   */
  search(query: string): this {
    if (this.version === ODataVersion.V4 && query) {
      this.queryParams.set('$search', query);
    }
    return this;
  }

  /**
   * Add $format clause
   */
  format(format: 'json' | 'xml' | 'atom'): this {
    this.queryParams.set('$format', format);
    return this;
  }

  /**
   * Add $skiptoken clause (for server-driven paging)
   */
  skipToken(token: string): this {
    if (token) {
      this.queryParams.set('$skiptoken', token);
    }
    return this;
  }

  /**
   * Add custom query parameter
   */
  custom(key: string, value: string): this {
    this.queryParams.set(key, value);
    return this;
  }

  /**
   * Build from ODataQueryOptions
   */
  fromOptions(options: ODataQueryOptions): this {
    if (options.$select) {
      this.select(...options.$select);
    }

    if (options.$expand) {
      this.expand(options.$expand);
    }

    if (options.$filter) {
      this.filter(options.$filter);
    }

    if (options.$orderby) {
      if (typeof options.$orderby === 'string') {
        this.orderBy(options.$orderby);
      } else {
        this.orderBy(options.$orderby);
      }
    }

    if (options.$top !== undefined) {
      this.top(options.$top);
    }

    if (options.$skip !== undefined) {
      this.skip(options.$skip);
    }

    if (options.$skiptoken) {
      this.skipToken(options.$skiptoken);
    }

    if (options.$count !== undefined) {
      this.count(options.$count);
    }

    if (options.$inlinecount) {
      // v2 inlinecount
      if (this.version === ODataVersion.V2) {
        this.queryParams.set('$inlinecount', options.$inlinecount);
      }
    }

    if (options.$format) {
      this.format(options.$format);
    }

    if (options.$search) {
      this.search(options.$search);
    }

    // Add any custom parameters
    Object.keys(options).forEach((key) => {
      if (
        !key.startsWith('$') ||
        ![
          '$select',
          '$expand',
          '$filter',
          '$orderby',
          '$top',
          '$skip',
          '$skiptoken',
          '$count',
          '$inlinecount',
          '$format',
          '$search',
        ].includes(key)
      ) {
        this.custom(key, options[key]);
      }
    });

    return this;
  }

  /**
   * Build the query string
   */
  build(): string {
    if (this.queryParams.size === 0) {
      return '';
    }

    const params: string[] = [];
    this.queryParams.forEach((value, key) => {
      // Don't encode system query options keys (they start with $)
      if (key.startsWith('$')) {
        params.push(`${key}=${value}`);
      } else {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    });

    return params.join('&');
  }

  /**
   * Build and return as URL search params
   */
  toURLSearchParams(): URLSearchParams {
    const searchParams = new URLSearchParams();
    this.queryParams.forEach((value, key) => {
      searchParams.set(key, value);
    });
    return searchParams;
  }

  /**
   * Clear all query parameters
   */
  clear(): this {
    this.queryParams.clear();
    return this;
  }

  /**
   * Clone the query builder
   */
  clone(): ODataQueryBuilder {
    const cloned = new ODataQueryBuilder(this.version);
    this.queryParams.forEach((value, key) => {
      cloned.queryParams.set(key, value);
    });
    return cloned;
  }

  /**
   * Helper: Create an AND filter group
   */
  static and(
    ...conditions: (ODataFilterCondition | ODataFilterGroup)[]
  ): ODataFilterGroup {
    return {
      logic: 'and',
      conditions,
    };
  }

  /**
   * Helper: Create an OR filter group
   */
  static or(
    ...conditions: (ODataFilterCondition | ODataFilterGroup)[]
  ): ODataFilterGroup {
    return {
      logic: 'or',
      conditions,
    };
  }

  /**
   * Helper: Create a filter condition
   */
  static condition(
    field: string,
    operator: ODataFilterOperator | string,
    value: any,
    negate: boolean = false
  ): ODataFilterCondition {
    return {
      field,
      operator,
      value,
      negate,
    };
  }
}

