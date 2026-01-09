# Omni ERP - AI Integration Platform

> API-driven connections between AI and ERP systems with OpenAI and MCP servers

## 🎯 **Overview**

Omni ERP is a comprehensive AI-powered integration platform that connects various ERP systems using REST, OData v2/v4, and implements AI workflows using Anthropic's Claude models with MCP (Model Context Protocol) servers.

## 🛠️ **Tech Stack**

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **React Flow** - Workflow builder

### Backend
- **Node.js 20+** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Bull/BullMQ** - Job queue system
- **Redis** - Caching and queue backend
- **Winston** - Logging

### AI & Integration
- **OpenAI GPT** - AI model integration (GPT-4, GPT-4 Turbo)
- **MCP (Model Context Protocol)** - AI agent orchestration
- **REST API** - Generic API connector
- **OData v2/v4** - SAP and enterprise system integration

## 📋 **Prerequisites**

- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB >= 6.0
- Redis >= 7.0 (optional, for queue system)
- OpenAI API Key

## 🚀 **Quick Start**

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd omni-erp

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit the .env files with your configuration
```

### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or start your local MongoDB service
```

### 4. Run Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend  # Backend on http://localhost:5000
npm run dev:frontend # Frontend on http://localhost:3000
```

## 📁 **Project Structure**

```
omni-erp/
├── frontend/                 # Next.js application
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and helpers
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript types
├── backend/                 # Express API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # MongoDB models
│   │   ├── middleware/      # Express middleware
│   │   ├── connectors/      # ERP connectors
│   │   ├── ai/              # AI services
│   │   ├── mcp/             # MCP servers
│   │   ├── utils/           # Utilities
│   │   └── types/           # TypeScript types
│   └── tests/               # Tests
├── shared/                  # Shared code between frontend/backend
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
└── docs/                    # Documentation

## 🔑 **Environment Variables**

See `.env.example` for all available environment variables.

Key variables:
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Secret for JWT token generation
- `REDIS_HOST` - Redis host (for queue system)

## 📚 **Documentation**

- [API Documentation](./docs/api.md) (Coming soon)
- [ERP Connector Guide](./docs/connectors.md) (Coming soon)
- [MCP Server Guide](./docs/mcp-servers.md) (Coming soon)
- [Deployment Guide](./docs/deployment.md) (Coming soon)

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

## 📦 **Building for Production**

```bash
# Build all packages
npm run build

# Build individually
npm run build:backend
npm run build:frontend
```

## 🤝 **Contributing**

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 **License**

ISC License

## 🆘 **Support**

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, Express, MongoDB, and OpenAI**

