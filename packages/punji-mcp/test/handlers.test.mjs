// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOPICS, getComponent, getGuide, indexSnapshot, listComponents, listResources, readResource, reviewUsage } from '../src/handlers.mjs';

const snapshot = JSON.parse(readFileSync(new URL('../data/snapshot.json', import.meta.url), 'utf8'));
const index = indexSnapshot(snapshot);
const textOf = (r) => r.content[0].text;
const rootPkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
const rules = (code) => reviewUsage(snapshot, index, { code }).structuredContent.findings.map((f) => f.rule);

describe('snapshot', () => {
  it('is pinned to the @punji/ui version in this repository', () => {
    expect(snapshot.version).toBe(rootPkg.version);
    expect(snapshot.items.length).toBeGreaterThan(100);
  });
});

describe('list_components', () => {
  it('lists everything with import, lead and stability', () => {
    const out = textOf(listComponents(snapshot));
    expect(out).toContain('money-display | MoneyDisplay');
    expect(out).toContain('@punji/ui/money-display');
    expect(out).toContain('pre-1.0');
  });
  it('filters by category, stability and search text', () => {
    const banking = textOf(listComponents(snapshot, { category: 'banking' }));
    expect(banking).toContain('bank-account-card');
    expect(banking).not.toContain('money-display |');
    expect(textOf(listComponents(snapshot, { stability: 'pattern' }))).toContain('portfolio-tracker');
    expect(textOf(listComponents(snapshot, { search: 'order book' }))).toContain('order-book');
  });
  it('explains an empty result', () => {
    expect(textOf(listComponents(snapshot, { search: 'zzzz-nothing' }))).toContain('No components match');
  });
});

describe('get_component', () => {
  it('returns import, props, usage, a11y and examples; accepts slug or export name', () => {
    const bySlug = textOf(getComponent(snapshot, index, { name: 'money-display' }));
    const byExport = textOf(getComponent(snapshot, index, { name: 'MoneyDisplay' }));
    expect(byExport).toBe(bySlug);
    expect(bySlug).toContain("import { MoneyDisplay } from '@punji/ui/money-display';");
    expect(bySlug).toContain('| value');
    expect(bySlug).toContain('## When to use');
    expect(bySlug).toContain('## Keyboard');
    expect(bySlug).toContain('## Accessibility');
    expect(bySlug).toContain('```tsx');
  });
  it('carries the UI-is-not-enforcement callout on UX-only components, and not on others', () => {
    expect(textOf(getComponent(snapshot, index, { name: 'hold-to-confirm' }))).toContain('UI is not enforcement');
    expect(textOf(getComponent(snapshot, index, { name: 'money-display' }))).not.toContain('UI is not enforcement');
  });
  it('suggests near matches for a typo and errors on no input', () => {
    const miss = getComponent(snapshot, index, { name: 'moneydisplays' });
    expect(miss.isError).toBe(true);
    expect(getComponent(snapshot, index, {}).isError).toBe(true);
  });
});

describe('get_guide', () => {
  it.each(TOPICS)('serves %s', (topic) => {
    const r = getGuide(snapshot, { topic });
    expect(r.isError).toBeUndefined();
    expect(textOf(r).length).toBeGreaterThan(300);
  });
  it('states the money rule and rejects unknown topics', () => {
    expect(textOf(getGuide(snapshot, { topic: 'money-rules' }))).toMatch(/bigint/);
    expect(getGuide(snapshot, { topic: 'nope' }).isError).toBe(true);
  });
});

describe('review_usage', () => {
  it('flags a number literal and float math passed to money props', () => {
    expect(rules('<MoneyDisplay value={125.5} />')).toEqual(['money-number']);
    expect(rules('<MoneyDisplay value={Number(total) * 100} />')).toEqual(['money-float']);
    expect(rules('<PriceChange current={parseFloat(a)} previous={1200} />')).toEqual(['money-float', 'money-number']);
    const fix = reviewUsage(snapshot, index, { code: '<MoneyDisplay value={12550} />' }).structuredContent.findings[0].fix;
    expect(fix).toContain('12550n');
  });
  it('accepts bigint and strings, and ignores number props on non-money components', () => {
    expect(rules('<MoneyDisplay value={12550n} />')).toEqual([]);
    expect(rules('<MoneyDisplay value="125.50" />')).toEqual([]);
    expect(rules('<MoneyDisplay value={cents} />')).toEqual([]);
    expect(rules('<Sparkline width={200} />')).toEqual([]);
  });
  it('handles arrow functions inside other props without losing the tag', () => {
    expect(rules('<MoneyDisplay format={(x) => x > 1} value={99} />')).toEqual(['money-number']);
  });
  it('flags BigInt() fed from floats', () => {
    expect(rules('const a = BigInt(12.5); const b = BigInt(Math.round(x * 100));')).toEqual(['money-bigint-from-float', 'money-bigint-from-float']);
    expect(rules('const a = BigInt(1250);')).toEqual([]);
  });
  it('flags root-barrel imports and suggests subpaths', () => {
    const [f] = reviewUsage(snapshot, index, { code: "import { MoneyDisplay, Button } from '@punji/ui';" }).structuredContent.findings;
    expect(f.rule).toBe('root-barrel-import');
    expect(f.fix).toContain("from '@punji/ui/money-display'");
    expect(f.fix).toContain("from '@punji/ui/button'");
    expect(rules("import { Button } from '@punji/ui/button';")).toEqual([]);
    expect(rules("import '@punji/ui/styles.css';")).toEqual([]);
  });
  it('flags javascript: hrefs in JSX and objects', () => {
    expect(rules('<a href="javascript:alert(1)">x</a>')).toEqual(['unsafe-href']);
    expect(rules("<Button href={'JavaScript:void(0)'}>x</Button>")).toEqual(['unsafe-href']);
    expect(rules("const l = { href: 'data:text/html,x' }")).toEqual(['unsafe-href']);
    expect(rules('<a href="/accounts">x</a>')).toEqual([]);
  });
  it('flags --pu-* overrides in CSS and style objects', () => {
    expect(rules(':root { --pu-color-bg: #fff; }')).toEqual(['pu-token-override']);
    expect(rules("<div style={{ '--pu-radius-md': '2px' }} />")).toEqual(['pu-token-override']);
    expect(rules('el.style.setProperty("--pu-space-2", "4px")')).toEqual(['pu-token-override']);
    expect(rules('.card { color: var(--pu-color-text); }')).toEqual([]);
  });
  it('reports clean code and rejects empty input', () => {
    expect(textOf(reviewUsage(snapshot, index, { code: '<MoneyDisplay value={12550n} />' }))).toContain('No findings');
    expect(reviewUsage(snapshot, index, { code: '  ' }).isError).toBe(true);
  });
});

describe('resources', () => {
  it('lists llms.txt and one markdown resource per entry, and reads them', () => {
    const list = listResources(snapshot);
    expect(list[0].uri).toBe('punji://llms.txt');
    expect(list).toHaveLength(snapshot.items.length + 1);
    expect(readResource(snapshot, 'punji://llms.txt').text).toContain('Punji');
    expect(readResource(snapshot, 'punji://components/money-display.md').text).toContain('# MoneyDisplay');
    expect(readResource(snapshot, 'punji://components/nope.md')).toBeNull();
  });
});

// The wiring test needs the SDK installed in packages/punji-mcp (`npm install` there). Root CI does not install it.
const sdkInstalled = existsSync(new URL('../node_modules/@modelcontextprotocol/sdk/package.json', import.meta.url));
describe.skipIf(!sdkInstalled)('server wiring (in-memory transport)', () => {
  it('registers the four tools and the resources over MCP', async () => {
    const { createServer } = await import('../src/server.mjs');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const server = createServer(snapshot);
    const client = new Client({ name: 'test', version: '0.0.0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);
    const tools = (await client.listTools()).tools.map((t) => t.name).toSorted();
    expect(tools).toEqual(['get_component', 'get_guide', 'list_components', 'review_usage']);
    const review = await client.callTool({ name: 'review_usage', arguments: { code: '<MoneyDisplay value={1.5} />' } });
    expect(review.content[0].text).toContain('money-number');
    const guide = await client.callTool({ name: 'get_guide', arguments: { topic: 'security' } });
    expect(guide.content[0].text).toContain('server');
    const res = await client.readResource({ uri: 'punji://llms.txt' });
    expect(res.contents[0].text).toContain('Punji');
    const comp = await client.readResource({ uri: 'punji://components/order-book.md' });
    expect(comp.contents[0].text).toContain('OrderBook');
    await client.close();
  });
});
