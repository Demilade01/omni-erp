# Omni ERP Backend

Express.js API server with TypeScript for AI Integration ERP Platform.

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Environment Setup

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Configure your environment variables (see `.env.example` for all options).

### Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (env, logger)
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic
│   ├── models/          # MongoDB models
│   ├── middleware/      # Express middleware
│   ├── connectors/      # ERP connectors (REST, OData)
│   ├── ai/              # AI services (Anthropic)
│   ├── mcp/             # MCP servers
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── logs/                # Application logs
├── dist/                # Compiled JavaScript (build output)
└── tests/               # Test files

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## 🔑 Environment Variables

Key environment variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `ANTHROPIC_API_KEY` - Anthropic API key for AI features
- `REDIS_HOST` - Redis host for queue system

See `.env.example` for complete list.

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### API Info
- `GET /api` - API information and endpoints

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### ERP Connections (Coming Soon)
- `GET /api/erp/connections` - List connections
- `POST /api/erp/connections` - Create connection
- `PUT /api/erp/connections/:id` - Update connection
- `DELETE /api/erp/connections/:id` - Delete connection
- `POST /api/erp/connections/:id/test` - Test connection

### Workflows (Coming Soon)
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### AI Features (Coming Soon)
- `POST /api/ai/field-mapping` - Get field mapping suggestions
- `POST /api/ai/query-convert` - Convert natural language to OData
- `POST /api/ai/chat` - AI chatbot for ERP queries

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API rate limiting
- **JWT** - JSON Web Token authentication
- **Input Validation** - express-validator
- **Error Handling** - Centralized error handling

## 📝 Logging

Winston logger with:
- Console logging (development)
- File logging with daily rotation (production)
- Error and combined logs
- HTTP request logging with Morgan

Logs are stored in the `logs/` directory.

## 🗄️ Database

MongoDB with Mongoose ORM

Models:
- **User** - User authentication and profiles
- **ERPConnection** - ERP system configurations
- **IntegrationMapping** - Field mappings between systems
- **Workflow** - AI workflow definitions
- **ExecutionLog** - Workflow execution history
- **APIKey** - API key management

## 🤖 AI Integration

OpenAI GPT integration for:
- Intelligent field mapping
- Natural language to OData query conversion
- Error diagnosis
- Data classification
- Report summarization
- Chatbot for ERP queries

## 🎭 MCP Servers

Model Context Protocol servers for AI agent orchestration:
- **ERP Data Server** - Fetch/update ERP data
- **Transformation Server** - Data mapping and transformation
- **Validation Server** - Business rules validation
- **Analytics Server** - Insights and reporting
- **Notification Server** - Alerts and webhooks

## 🔌 ERP Connectors

Generic connectors for:
- **REST APIs** - Any REST-based ERP
- **OData v2/v4** - SAP and other OData services
- **SAP S/4HANA** - Specific SAP connector
- **SuccessFactors** - HR cloud platform
- **Workday** - HR and finance system

## 🧪 Testing

Jest testing framework with:
- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests for critical workflows
- Coverage reporting

## 📚 Documentation

API documentation available at `/api/docs` (Swagger/OpenAPI).

## 🐛 Debugging

Use VS Code launch configuration:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeArgs": ["-r", "tsx/register"],
  "args": ["${workspaceFolder}/backend/src/server.ts"],
  "cwd": "${workspaceFolder}/backend",
  "envFile": "${workspaceFolder}/backend/.env"
}
```

## 📦 Dependencies

**Production:**
- express - Web framework
- mongoose - MongoDB ODM
- openai - OpenAI API
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing
- winston - Logging
- cors - CORS middleware
- helmet - Security headers
- bull - Job queue

**Development:**
- typescript - Type checking
- tsx - TypeScript execution
- eslint - Code linting
- prettier - Code formatting

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run lints and tests
4. Submit PR

## 📄 License

ISC

