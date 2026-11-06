#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from '../src/server.mjs';

// stdout carries the protocol: log only to stderr.
let server;
try {
  server = createServer();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
await server.connect(new StdioServerTransport());
console.error('punji-mcp ready (stdio)');
