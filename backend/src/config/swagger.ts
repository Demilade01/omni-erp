import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Omni ERP API',
      version: '1.0.0',
      description: `
        AI Integration ERP Platform API - Connect and integrate multiple ERP systems with AI-powered features.

        ## Features
        - 🔐 JWT Authentication
        - 🔌 ERP Connectors (REST, OData v2/v4)
        - 🤖 OpenAI Integration
        - 🎭 MCP Servers for AI Agent Orchestration
        - 📊 Data Transformation & Mapping
        - ⚙️ Workflow Automation

        ## Authentication
        Most endpoints require authentication. Include the JWT token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@omni-erp.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.omni-erp.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for service-to-service authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'viewer'],
              example: 'user',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ERPConnection: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'SAP Production',
            },
            type: {
              type: 'string',
              enum: ['sap', 'successfactors', 'workday', 'generic_rest', 'generic_odata'],
              example: 'sap',
            },
            baseUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://api.sap.com',
            },
            authType: {
              type: 'string',
              enum: ['oauth2', 'api_key', 'basic', 'jwt'],
              example: 'oauth2',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'error'],
              example: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Workflow: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Employee Sync Workflow',
            },
            description: {
              type: 'string',
              example: 'Syncs employee data from SAP to Workday',
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'paused', 'completed', 'failed'],
              example: 'active',
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Unauthorized',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission to perform this action',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Forbidden',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and system status',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Connectors',
        description: 'Manage ERP connector configurations',
      },
      {
        name: 'Connector Data',
        description: 'Execute REST/OData requests through connectors',
      },
      {
        name: 'Workflows',
        description: 'Workflow creation and execution',
      },
      {
        name: 'AI',
        description: 'AI-powered features (OpenAI GPT)',
      },
      {
        name: 'Data Mapping',
        description: 'Field mapping and data transformation',
      },
      {
        name: 'MCP',
        description: 'Model Context Protocol servers',
      },
    ],
  },
  // Path to API routes with JSDoc comments
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

