#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from '../src/server.mjs';

// stdout carries the protocol: log only to stderr.
const server = createServer();
await server.connect(new StdioServerTransport());
console.error('punji-mcp ready (stdio)');
