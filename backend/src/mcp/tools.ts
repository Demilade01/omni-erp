/**
 * MCP Server Tools
 * Defines available tools for the MCP server
 */

import { z } from 'zod';
import { logger } from '../config/logger';
import { connectorService } from '../services/connector.service';
import { workflowService } from '../services/workflow.service';
import { aiService } from '../ai';
import { ERPConnection, Workflow, IntegrationMapping } from '../models';
import { ToolResult, MCPToolContext } from './types';

/**
 * Tool definitions with schemas and handlers
 */
export const mcpTools = {
  /**
   * List available ERP connections
   */
  list_connections: {
    name: 'list_connections',
    description: 'List all available ERP connections for the current user',
    inputSchema: z.object({
      status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
      type: z.string().optional(),
    }),
    handler: async (
      params: { status?: string; type?: string },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const query: any = { userId: context.userId, isActive: true };

        if (params.status && params.status !== 'all') {
          query.status = params.status;
        }
        if (params.type) {
          query.type = params.type;
        }

        const connections = await ERPConnection.find(query)
          .select('name type status baseUrl metadata')
          .lean();

        return {
          success: true,
          data: connections.map(c => ({
            id: c._id.toString(),
            name: c.name,
            type: c.type,
            status: c.status,
            baseUrl: c.baseUrl,
          })),
        };
      } catch (error) {
        logger.error('MCP list_connections error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list connections',
        };
      }
    },
  },

  /**
   * Query data from an ERP connection
   */
  query_erp: {
    name: 'query_erp',
    description: 'Query data from an ERP connection using OData or REST',
    inputSchema: z.object({
      connectionId: z.string().describe('The ID of the ERP connection to query'),
      entitySet: z.string().describe('The entity set or endpoint to query'),
      select: z.array(z.string()).optional().describe('Fields to select'),
      filter: z.string().optional().describe('OData filter expression'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip'),
      orderBy: z.string().optional().describe('Order by expression'),
      expand: z.array(z.string()).optional().describe('Related entities to expand'),
    }),
    handler: async (
      params: {
        connectionId: string;
        entitySet: string;
        select?: string[];
        filter?: string;
        top?: number;
        skip?: number;
        orderBy?: string;
        expand?: string[];
      },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const connector = await connectorService.getConnector(
          params.connectionId,
          context.userId!
        );

        if (!connector.isConnected()) {
          await connector.connect();
        }

        // Build query options for OData
        const queryOptions: any = {};
        if (params.select) queryOptions.$select = params.select;
        if (params.filter) queryOptions.$filter = params.filter;
        if (params.top) queryOptions.$top = params.top;
        if (params.skip) queryOptions.$skip = params.skip;
        if (params.orderBy) queryOptions.$orderby = params.orderBy;
        if (params.expand) queryOptions.$expand = params.expand;

        // Use the ODataConnector's public query method
        const result = await (connector as any).query(params.entitySet, queryOptions);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('MCP query_erp error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to query ERP',
        };
      }
    },
  },

  /**
   * Create a record in an ERP system
   */
  create_erp_record: {
    name: 'create_erp_record',
    description: 'Create a new record in an ERP system',
    inputSchema: z.object({
      connectionId: z.string().describe('The ID of the ERP connection'),
      entitySet: z.string().describe('The entity set to create the record in'),
      data: z.record(z.string(), z.any()).describe('The record data to create'),
    }),
    handler: async (
      params: {
        connectionId: string;
        entitySet: string;
        data: Record<string, any>;
      },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const connector = await connectorService.getConnector(
          params.connectionId,
          context.userId!
        );

        if (!connector.isConnected()) {
          await connector.connect();
        }

        // Use the ODataConnector's public createEntity method
        const result = await (connector as any).createEntity(params.entitySet, params.data);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('MCP create_erp_record error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create record',
        };
      }
    },
  },

  /**
   * Update a record in an ERP system
   */
  update_erp_record: {
    name: 'update_erp_record',
    description: 'Update an existing record in an ERP system',
    inputSchema: z.object({
      connectionId: z.string().describe('The ID of the ERP connection'),
      entitySet: z.string().describe('The entity set containing the record'),
      key: z.string().describe('The key/ID of the record to update'),
      data: z.record(z.string(), z.any()).describe('The updated record data'),
    }),
    handler: async (
      params: {
        connectionId: string;
        entitySet: string;
        key: string;
        data: Record<string, any>;
      },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const connector = await connectorService.getConnector(
          params.connectionId,
          context.userId!
        );

        if (!connector.isConnected()) {
          await connector.connect();
        }

        // Use the ODataConnector's public patchEntity method
        const result = await (connector as any).patchEntity(params.entitySet, params.key, params.data);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('MCP update_erp_record error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update record',
        };
      }
    },
  },

  /**
   * Get AI-suggested field mappings
   */
  suggest_field_mappings: {
    name: 'suggest_field_mappings',
    description: 'Get AI-suggested field mappings between source and target schemas',
    inputSchema: z.object({
      sourceSchema: z.record(z.string(), z.any()).describe('The source entity schema'),
      targetSchema: z.record(z.string(), z.any()).describe('The target entity schema'),
      context: z.string().optional().describe('Additional context about the mapping'),
    }),
    handler: async (
      params: {
        sourceSchema: Record<string, any>;
        targetSchema: Record<string, any>;
        context?: string;
      },
      _context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const suggestions = await aiService.suggestFieldMappings(
          params.sourceSchema,
          params.targetSchema,
          params.context
        );

        return {
          success: true,
          data: suggestions,
        };
      } catch (error) {
        logger.error('MCP suggest_field_mappings error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate suggestions',
        };
      }
    },
  },

  /**
   * Generate OData query from natural language
   */
  generate_odata_query: {
    name: 'generate_odata_query',
    description: 'Generate an OData query from a natural language description',
    inputSchema: z.object({
      description: z.string().describe('Natural language description of the query'),
      entitySet: z.string().describe('The target entity set'),
      availableFields: z.array(z.string()).optional().describe('Available fields to query'),
    }),
    handler: async (
      params: {
        description: string;
        entitySet: string;
        availableFields?: string[];
      },
      _context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const result = await aiService.naturalLanguageToOData(
          params.description,
          params.entitySet,
          params.availableFields || [],
          'v4'
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('MCP generate_odata_query error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate query',
        };
      }
    },
  },

  /**
   * Diagnose an error
   */
  diagnose_error: {
    name: 'diagnose_error',
    description: 'Get AI-powered diagnosis and solutions for an error',
    inputSchema: z.object({
      error: z.string().describe('The error message or stack trace'),
      context: z.string().optional().describe('Additional context about when the error occurred'),
    }),
    handler: async (
      params: { error: string; context?: string },
      _context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const diagnosis = await aiService.diagnoseError(
          'runtime',
          params.error,
          undefined,
          {
            system: 'ERP Integration',
            operation: params.context || 'Unknown operation',
          }
        );

        return {
          success: true,
          data: diagnosis,
        };
      } catch (error) {
        logger.error('MCP diagnose_error error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to diagnose error',
        };
      }
    },
  },

  /**
   * List workflows
   */
  list_workflows: {
    name: 'list_workflows',
    description: 'List available workflows',
    inputSchema: z.object({
      status: z.enum(['draft', 'active', 'paused', 'all']).optional().default('all'),
    }),
    handler: async (
      params: { status?: string },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const query: any = { userId: context.userId, isActive: true };

        if (params.status && params.status !== 'all') {
          query.status = params.status;
        }

        const workflows = await Workflow.find(query)
          .select('name description status lastExecutedAt executionCount')
          .lean();

        return {
          success: true,
          data: workflows.map(w => ({
            id: w._id.toString(),
            name: w.name,
            description: w.description,
            status: w.status,
            lastExecutedAt: w.lastExecutedAt,
            executionCount: w.executionCount,
          })),
        };
      } catch (error) {
        logger.error('MCP list_workflows error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list workflows',
        };
      }
    },
  },

  /**
   * Execute a workflow
   */
  execute_workflow: {
    name: 'execute_workflow',
    description: 'Execute a workflow with optional input data',
    inputSchema: z.object({
      workflowId: z.string().describe('The ID of the workflow to execute'),
      input: z.record(z.string(), z.any()).optional().describe('Input data for the workflow'),
      async: z.boolean().optional().default(true).describe('Whether to run asynchronously'),
    }),
    handler: async (
      params: {
        workflowId: string;
        input?: Record<string, any>;
        async?: boolean;
      },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const executionLog = await workflowService.executeWorkflow(
          params.workflowId,
          context.userId!,
          { input: params.input }
        );

        return {
          success: true,
          data: {
            executionId: executionLog.executionId,
            status: executionLog.status,
            startTime: executionLog.startTime,
          },
        };
      } catch (error) {
        logger.error('MCP execute_workflow error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute workflow',
        };
      }
    },
  },

  /**
   * List integration mappings
   */
  list_mappings: {
    name: 'list_mappings',
    description: 'List available integration mappings',
    inputSchema: z.object({
      sourceConnectionId: z.string().optional().describe('Filter by source connection'),
      targetConnectionId: z.string().optional().describe('Filter by target connection'),
    }),
    handler: async (
      params: { sourceConnectionId?: string; targetConnectionId?: string },
      context: MCPToolContext
    ): Promise<ToolResult> => {
      try {
        const query: any = { userId: context.userId, isActive: true };

        if (params.sourceConnectionId) {
          query.sourceConnectionId = params.sourceConnectionId;
        }
        if (params.targetConnectionId) {
          query.targetConnectionId = params.targetConnectionId;
        }

        const mappings = await IntegrationMapping.find(query)
          .populate('sourceConnectionId', 'name type')
          .populate('targetConnectionId', 'name type')
          .select('name description sourceEntity targetEntity')
          .lean();

        return {
          success: true,
          data: mappings.map(m => ({
            id: m._id.toString(),
            name: m.name,
            description: m.description,
            sourceEntity: m.sourceEntity,
            targetEntity: m.targetEntity,
            sourceConnection: m.sourceConnectionId,
            targetConnection: m.targetConnectionId,
          })),
        };
      } catch (error) {
        logger.error('MCP list_mappings error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list mappings',
        };
      }
    },
  },
};

/**
 * Get all tool definitions for MCP server registration
 */
export function getToolDefinitions() {
  return Object.values(mcpTools).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  params: any,
  context: MCPToolContext
): Promise<ToolResult> {
  const tool = mcpTools[toolName as keyof typeof mcpTools];

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    // Validate params against schema
    const validated = tool.inputSchema.parse(params);
    return await tool.handler(validated as any, context);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid parameters: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`,
      };
    }
    throw error;
  }
}
