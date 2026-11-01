// Table benchmark: 10,000 synthetic trades (fixtures/trade-data.ts, seeded) in
// VirtualFinancialTable and, for comparison, the plain FinancialTable, in headless
// Chromium. Measures initial render (synchronous commit and first painted frame),
// a scroll FPS proxy (frame times while scrolling a fixed step every frame) and
// 1,000 row updates a second (batched per frame, each batch committed
// synchronously so its cost is measured). Needs `npm run build` first.
//
//   node scripts/bench-table.mjs            # Markdown table
//   node scripts/bench-table.mjs --json     # raw numbers
//   ROWS=100000 MODES=virtual RUNS=7 node scripts/bench-table.mjs
//
// Numbers depend on the machine; compare runs on one machine, not across machines.
// Results for the published numbers are in docs/PERFORMANCE.md.
import { cpus, platform, release } from 'node:os';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const harness = `${root}test/bench`;
const outDir = `${root}test-results/bench-dist`;
const ROWS = Number(process.env.ROWS ?? 10_000);
const RUNS = Number(process.env.RUNS ?? 5);
const MODES = (process.env.MODES ?? 'virtual,plain').split(',').filter((m) => m === 'virtual' || m === 'plain');
const json = process.argv.includes('--json');
if (!existsSync(`${root}dist/virtual-table/VirtualFinancialTable.js`)) throw new Error('Run `npm run build` first: the benchmark measures the built package.');

rmSync(outDir, { recursive: true, force: true });
await build({ root: harness, logLevel: 'error', build: { outDir, emptyOutDir: true } });
// Port 0: the OS picks a free port, so this never collides with another preview server.
const server = await preview({ root: harness, logLevel: 'error', build: { outDir }, preview: { host: '127.0.0.1', port: 0 } });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
const row = (r) => `| ${r.mode === 'virtual' ? 'VirtualFinancialTable' : 'FinancialTable (plain)'} | ${r.rowsInDom} | ${r.commitMs} | ${r.paintMs} | ${r.scroll.fps} | ${r.scroll.p95Ms} | ${r.updates.updatesPerSecond} | ${r.updates.commitMeanMs} / ${r.updates.commitP95Ms} | ${r.updates.fps} |`;
const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];

async function measure(mode) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url);
  await page.waitForFunction(() => document.title === 'ready');
  const mounts = [];
  for (let i = 0; i < RUNS; i++) mounts.push(await page.evaluate(([m, n]) => window.bench.mount(m, n), [mode, ROWS]));
  const scroll = await page.evaluate(() => window.bench.scroll(3000, 120));
  const updates = await page.evaluate(() => window.bench.updates(5000, 1000));
  await page.close();
  return {
    mode,
    rows: ROWS,
    rowsInDom: mounts[0].rowsInDom,
    commitMs: median(mounts.map((m) => m.commitMs)),
    paintMs: median(mounts.map((m) => m.paintMs)),
    scroll,
    updates,
  };
}

try {
  const results = [];
  for (const mode of MODES) results.push(await measure(mode));
  const env = { date: new Date().toLocaleDateString('en-CA'), cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length, os: `${platform()} ${release()}`, node: process.version, chromium: browser.version(), rows: ROWS, runs: RUNS };
  if (json) {
    console.log(JSON.stringify({ env, results }, null, 2));
  } else {
    console.log(`${env.date}, ${env.cpu} (${env.cores} cores), ${env.os}, Node ${env.node}, Chromium ${env.chromium}, ${ROWS.toLocaleString('en-US')} rows, median of ${RUNS} mounts\n`);
    console.log('| Table | Rows in DOM | Initial commit (ms) | First paint (ms) | Scroll FPS | Scroll p95 frame (ms) | Updates/s applied | Update commit mean / p95 (ms) | FPS while updating |');
    console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const r of results) console.log(row(r));
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
