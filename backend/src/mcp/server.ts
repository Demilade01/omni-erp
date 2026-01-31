#!/usr/bin/env node
/**
 * MCP Server Entry Point
 * Standalone entry point for running the MCP server
 *
 * Usage:
 *   npx tsx src/mcp/server.ts
 *
 * Or add to package.json scripts:
 *   "mcp": "tsx src/mcp/server.ts"
 */

import { config } from 'dotenv';
import { MCPServer } from './MCPServer';
import { connectDatabase } from '../config/database';

// Load environment variables
config();

async function main() {
  try {
    // Connect to database
    await connectDatabase();
    console.error('[MCP Server] Connected to database');

    // Create and start MCP server
    const server = new MCPServer();
    await server.start();

    console.error('[MCP Server] Running on stdio transport');
    console.error('[MCP Server] Ready to accept connections');
  } catch (error) {
    console.error('[MCP Server] Failed to start:', error);
    process.exit(1);
  }
}

main();
