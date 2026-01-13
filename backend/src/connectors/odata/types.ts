/**
 * OData Connector Types
 * Supports OData v2 and v4 protocols
 */

import {
  ConnectorConfig,
  ConnectorResponse,
} from '../types/connector.types';

/**
 * OData Protocol Version
 */
export enum ODataVersion {
  V2 = 'v2',
  V4 = 'v4',
}

/**
 * OData Request Options
 */
export interface ODataRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  validateResponse?: boolean;
  rawResponse?: boolean;
}

/**
 * OData Response
 */
export interface ODataResponse<T = any> extends ConnectorResponse<T> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
  value?: T[];
}

/**
 * OData Error Response
 */
export interface ODataError {
  error: {
    code: string;
    message: {
      lang?: string;
      value: string;
    };
    innererror?: {
      message?: string;
      type?: string;
      stacktrace?: string;
    };
  };
}

/**
 * Filter Operators for OData
 */
export enum ODataFilterOperator {
  // Comparison
  EQ = 'eq', // Equal
  NE = 'ne', // Not equal
  GT = 'gt', // Greater than
  GE = 'ge', // Greater than or equal
  LT = 'lt', // Less than
  LE = 'le', // Less than or equal

  // Logical
  AND = 'and',
  OR = 'or',
  NOT = 'not',

  // String Functions (v4)
  CONTAINS = 'contains',
  STARTSWITH = 'startswith',
  ENDSWITH = 'endswith',

  // Collection (v4)
  IN = 'in',
  HAS = 'has',
}

/**
 * OData Filter Condition
 */
export interface ODataFilterCondition {
  field: string;
  operator: ODataFilterOperator | string;
  value: any;
  negate?: boolean;
}

/**
 * OData Filter Group (for AND/OR combinations)
 */
export interface ODataFilterGroup {
  logic: 'and' | 'or';
  conditions: (ODataFilterCondition | ODataFilterGroup)[];
}

/**
 * OData Order By
 */
export interface ODataOrderBy {
  field: string;
  direction?: 'asc' | 'desc';
}

/**
 * OData Query Options
 */
export interface ODataQueryOptions {
  // Selection
  $select?: string[]; // Select specific fields
  $expand?: string | string[] | ODataExpandOptions[]; // Expand navigation properties

  // Filtering
  $filter?: string | ODataFilterCondition | ODataFilterGroup; // Filter results

  // Ordering
  $orderby?: string | ODataOrderBy[]; // Order results

  // Pagination
  $top?: number; // Limit results
  $skip?: number; // Skip results
  $skiptoken?: string; // Server-driven paging token (v4)

  // Counting
  $count?: boolean; // Include count in response (v4)
  $inlinecount?: 'allpages' | 'none'; // Include count (v2)

  // Format
  $format?: 'json' | 'xml' | 'atom'; // Response format

  // Search (v4 only)
  $search?: string; // Full-text search

  // Custom query parameters
  [key: string]: any;
}

/**
 * OData Expand Options
 */
export interface ODataExpandOptions {
  navigationProperty: string;
  select?: string[];
  filter?: string | ODataFilterCondition;
  orderby?: ODataOrderBy[];
  top?: number;
  skip?: number;
  expand?: ODataExpandOptions[]; // Nested expand
}

/**
 * OData Metadata - Entity Type
 */
export interface ODataEntityType {
  name: string;
  namespace?: string;
  key: string[];
  properties: ODataProperty[];
  navigationProperties?: ODataNavigationProperty[];
}

/**
 * OData Property
 */
export interface ODataProperty {
  name: string;
  type: string;
  nullable?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  unicode?: boolean;
  defaultValue?: any;
}

/**
 * OData Navigation Property
 */
export interface ODataNavigationProperty {
  name: string;
  type: string;
  partner?: string;
  containsTarget?: boolean;
  referentialConstraint?: {
    property: string;
    referencedProperty: string;
  };
}

/**
 * OData Entity Set
 */
export interface ODataEntitySet {
  name: string;
  entityType: string;
  navigationPropertyBindings?: Record<string, string>;
}

/**
 * OData Service Metadata
 */
export interface ODataServiceMetadata {
  version: ODataVersion;
  dataServiceVersion?: string;
  entityTypes: ODataEntityType[];
  entitySets: ODataEntitySet[];
  functions?: ODataFunction[];
  actions?: ODataAction[];
}

/**
 * OData Function/Action
 */
export interface ODataFunction {
  name: string;
  namespace?: string;
  isBound?: boolean;
  parameters?: ODataParameter[];
  returnType?: string;
}

export interface ODataAction extends ODataFunction {
  // Actions are similar to functions but can have side effects
}

/**
 * OData Parameter
 */
export interface ODataParameter {
  name: string;
  type: string;
  nullable?: boolean;
}

/**
 * OData Batch Request Item
 */
export interface ODataBatchRequestItem {
  id?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  atomicityGroup?: string; // For grouping operations in changeset
}

/**
 * OData Batch Response Item
 */
export interface ODataBatchResponseItem {
  id?: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: any;
}

/**
 * OData Connector Configuration
 */
export interface ODataConnectorConfig extends ConnectorConfig {
  version: ODataVersion;
  serviceRoot?: string; // Service root URL (if different from baseUrl)
  csrf?: boolean; // Enable CSRF token handling (for SAP)
  useBatch?: boolean; // Use batch requests by default
  maxBatchSize?: number; // Maximum number of requests per batch
  preferMinimalMetadata?: boolean; // Use minimal metadata in responses (v4)
  ieee754Compatible?: boolean; // Use IEEE754-compatible format for numbers (v4)
}

/**
 * OData CSRF Token
 */
export interface ODataCSRFToken {
  token: string;
  expiresAt?: Date;
}

/**
 * OData Change Set (for batch requests)
 */
export interface ODataChangeSet {
  id: string;
  requests: ODataBatchRequestItem[];
}

/**
 * OData Batch Request
 */
export interface ODataBatchRequest {
  requests: ODataBatchRequestItem[];
  changeSets?: ODataChangeSet[];
}

/**
 * OData Batch Response
 */
export interface ODataBatchResponse {
  responses: ODataBatchResponseItem[];
}

/**
 * OData Count Response
 */
export interface ODataCountResponse {
  count: number;
}

/**
 * OData Function/Action Call Options
 */
export interface ODataFunctionCallOptions {
  parameters?: Record<string, any>;
  headers?: Record<string, string>;
  bindingParameter?: any; // For bound functions/actions
}

/**
 * OData Delta Link (for change tracking)
 */
export interface ODataDeltaResponse<T = any> extends ODataResponse<T> {
  '@odata.deltaLink': string;
}

