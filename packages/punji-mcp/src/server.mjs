import { readFileSync } from 'node:fs';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TOPICS, getComponent, getGuide, indexSnapshot, listComponents, listResources, readResource, reviewUsage } from './handlers.mjs';

export function loadSnapshot() {
  return JSON.parse(readFileSync(new URL('../data/snapshot.json', import.meta.url), 'utf8'));
}

/** Build the MCP server over a snapshot (defaults to the bundled one). Transport is attached by the caller. */
export function createServer(snapshot = loadSnapshot()) {
  const index = indexSnapshot(snapshot);
  const server = new McpServer(
    { name: 'punji-mcp', version: '0.0.0' },
    { instructions: `Helps use @punji/ui ${snapshot.version} correctly. Money is bigint minor units, never number. Import from subpaths, not the root. Call get_component before writing JSX, and review_usage on code you wrote. UI components are not enforcement: authorise and validate on the server.` },
  );

  server.registerTool('list_components', {
    title: 'List Punji components',
    description: 'List @punji/ui components, utilities, hooks and copy-in patterns with their subpath import, one-line lead and stability. Filter by category (group id or kind), stability or search text.',
    inputSchema: {
      category: z.string().optional().describe('Group id (for example stock-market, banking, forms) or kind (component, utility, hooks, showcase, app).'),
      stability: z.enum(['pre-1.0', 'pattern']).optional(),
      search: z.string().optional().describe('Words matched against slug, title, description and export names.'),
    },
    annotations: { readOnlyHint: true },
  }, async (args) => listComponents(snapshot, args));

  server.registerTool('get_component', {
    title: 'Get a Punji component',
    description: 'Import line, props table, when to use or avoid, keyboard and accessibility notes, the UI-is-not-enforcement callout where it applies, runnable examples and related components. Accepts a slug (money-display), title or export name (MoneyDisplay).',
    inputSchema: { name: z.string().describe('Slug, title or export name.') },
    annotations: { readOnlyHint: true },
  }, async (args) => getComponent(snapshot, index, args));

  server.registerTool('get_guide', {
    title: 'Get a Punji guide',
    description: `Documentation for a topic: ${TOPICS.join(', ')}.`,
    inputSchema: { topic: z.enum(TOPICS) },
    annotations: { readOnlyHint: true },
  }, async (args) => getGuide(snapshot, args));

  server.registerTool('review_usage', {
    title: 'Review Punji usage',
    description: 'Static review of code that uses @punji/ui (nothing is executed): money passed as number or float to money props, root-barrel imports, javascript: hrefs and --pu-* token overrides. Returns findings with fixes.',
    inputSchema: { code: z.string().describe('TSX/TS/CSS source to review.') },
    annotations: { readOnlyHint: true },
  }, async (args) => reviewUsage(snapshot, index, args));

  server.registerResource('llms', 'punji://llms.txt', { title: 'llms.txt', description: 'Index of the Punji UI docs for LLMs', mimeType: 'text/plain' },
    async (uri) => ({ contents: [readResource(snapshot, uri.href)] }));

  server.registerResource('component', new ResourceTemplate('punji://components/{slug}.md', {
    list: async () => ({ resources: listResources(snapshot).slice(1) }),
  }), { title: 'Component markdown', mimeType: 'text/markdown' }, async (uri) => {
    const r = readResource(snapshot, uri.href);
    if (!r) throw new Error(`Unknown resource ${uri.href}`);
    return { contents: [r] };
  });

  return server;
}
