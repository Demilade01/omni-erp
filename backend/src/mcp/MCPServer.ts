/**
 * MCP Server
 * Model Context Protocol server for Omni ERP
 * Exposes ERP operations and AI features as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../config/logger';
import { mcpTools, executeTool } from './tools';
import { MCPToolContext } from './types';
import { ERPConnection, Workflow } from '../models';
import { zodToJsonSchema } from './utils';

/**
 * MCP Server Class
 */
export class MCPServer {
  private server: Server;
  private context: MCPToolContext;

  constructor(context: MCPToolContext = {}) {
    this.context = context;
    this.server = new Server(
      {
        name: 'omni-erp-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('MCP: ListTools request');

      const tools = Object.values(mcpTools).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      }));

      return { tools };
    });

    // Execute a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.debug(`MCP: CallTool request - ${name}`, { args });

      try {
        const result = await executeTool(name, args || {}, this.context);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: result.error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`MCP tool execution error: ${name}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Tool execution failed'
        );
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('MCP: ListResources request');

      const resources = [];

      // Add connections as resources
      if (this.context.userId) {
        try {
          const connections = await ERPConnection.find({
            userId: this.context.userId,
            isActive: true,
          }).select('name type').lean();

          for (const conn of connections) {
            resources.push({
              uri: `erp://connection/${conn._id}`,
              name: `ERP Connection: ${conn.name}`,
              description: `${conn.type} ERP connection`,
              mimeType: 'application/json',
            });
          }

          // Add workflows as resources
          const workflows = await Workflow.find({
            userId: this.context.userId,
            isActive: true,
          }).select('name description').lean();

          for (const wf of workflows) {
            resources.push({
              uri: `workflow://${wf._id}`,
              name: `Workflow: ${wf.name}`,
              description: wf.description || 'Integration workflow',
              mimeType: 'application/json',
            });
          }
        } catch (error) {
          logger.error('MCP ListResources error:', error);
        }
      }

      return { resources };
    });

    // Read a resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.debug(`MCP: ReadResource request - ${uri}`);

      try {
        // Parse URI
        const url = new URL(uri);
        const resourceType = url.protocol.replace(':', '');
        const resourceId = url.pathname.replace(/^\/+/, '');

        let content: any;

        switch (resourceType) {
          case 'erp':
            if (url.host === 'connection') {
              const connection = await ERPConnection.findOne({
                _id: resourceId,
                userId: this.context.userId,
                isActive: true,
              }).select('-credentials').lean();

              if (!connection) {
                throw new McpError(ErrorCode.InvalidRequest, 'Connection not found');
              }
              content = connection;
            }
            break;

          case 'workflow':
            const workflow = await Workflow.findOne({
              _id: resourceId,
              userId: this.context.userId,
              isActive: true,
            }).lean();

            if (!workflow) {
              throw new McpError(ErrorCode.InvalidRequest, 'Workflow not found');
            }
            content = workflow;
            break;

          default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource type: ${resourceType}`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) throw error;
        logger.error('MCP ReadResource error:', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Failed to read resource'
        );
      }
    });
  }

  /**
   * Set the user context
   */
  setContext(context: MCPToolContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Start the server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started with stdio transport');
  }

  /**
   * Get the server instance
   */
  getServer(): Server {
    return this.server;
  }
}

/**
 * Create and start MCP server (for standalone mode)
 */
export async function createMCPServer(context?: MCPToolContext): Promise<MCPServer> {
  const server = new MCPServer(context);
  return server;
}

// Export singleton for use within Express app
let mcpServerInstance: MCPServer | null = null;

export function getMCPServer(context?: MCPToolContext): MCPServer {
  if (!mcpServerInstance) {
    mcpServerInstance = new MCPServer(context);
  } else if (context) {
    mcpServerInstance.setContext(context);
  }
  return mcpServerInstance;
}
