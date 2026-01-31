/**
 * MCP Server Types
 * Type definitions for MCP server implementation
 */

/**
 * MCP Tool Context - passed to tool handlers
 */
export interface MCPToolContext {
  userId?: string;
  sessionId?: string;
  connectionId?: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Connector query parameters
 */
export interface ConnectorQueryParams {
  connectionId: string;
  entitySet: string;
  select?: string[];
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
  expand?: string[];
}

/**
 * Connector mutation parameters
 */
export interface ConnectorMutationParams {
  connectionId: string;
  entitySet: string;
  data: Record<string, any>;
  key?: string;
}

/**
 * AI assist parameters
 */
export interface AIAssistParams {
  type: 'field-mapping' | 'query-builder' | 'error-diagnosis' | 'data-transform';
  sourceSchema?: Record<string, any>;
  targetSchema?: Record<string, any>;
  query?: string;
  error?: string;
  context?: string;
}

/**
 * Workflow execution parameters
 */
export interface WorkflowExecuteParams {
  workflowId: string;
  input?: Record<string, any>;
  async?: boolean;
}

/**
 * Connection info for resources
 */
export interface ConnectionInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  baseUrl: string;
}

/**
 * Entity schema for resources
 */
export interface EntitySchema {
  name: string;
  properties: Array<{
    name: string;
    type: string;
    nullable?: boolean;
  }>;
  keys: string[];
}
