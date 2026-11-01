// Chart benchmark: CandlestickChart, PerformanceChart, DepthChart, Sparkline,
// Live and LiveFigure in headless Chromium, through the built package (dist/).
//
//   1. Ticks: 10, 100 and 1,000 updates a second for 4 s, each update its own
//      task (as socket messages arrive). Frame pacing, long tasks, React commits
//      per tick (a Profiler on the profiling build of react-dom) and JS heap.
//   2. Sizes: 1k, 10k and 100k candles (and dates, and closes per sparkline):
//      mount time, DOM nodes, and the cost of one synchronous update.
//
//   npm run build && npm run bench:charts           # Markdown tables
//   node scripts/bench-charts.mjs --json            # raw numbers
//   SCENARIOS=candlestick,live RATES=1000 SIZES=100000 BENCH_SECONDS=2 node scripts/bench-charts.mjs
//
// Numbers depend on the machine; compare runs on one machine. Published numbers
// and the method are in docs/PERFORMANCE.md.
import { cpus, platform, release } from 'node:os';
import { existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const harness = `${root}test/bench-charts`;
const outDir = `${root}test-results/bench-charts-dist`;
const list = (name, fallback) => (process.env[name] ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);
const ALL = ['candlestick', 'performance', 'depth', 'sparkline', 'live', 'live-figure'];
const SCENARIOS = list('SCENARIOS', ALL.join(',')).filter((s) => ALL.includes(s));
const RATES = list('RATES', '10,100,1000').map(Number);
const SIZES = list('SIZES', '1000,10000,100000').map(Number);
const SECONDS = Number(process.env.BENCH_SECONDS ?? 4);
const json = process.argv.includes('--json');
if (!existsSync(`${root}dist/candlestick-chart/CandlestickChart.js`)) throw new Error('Run `npm run build` first: the benchmark measures the built package.');

/** Data for the tick runs: 1,000 candles or dates, a 50-level book, a 50-row sparkline watchlist, 100 live prices. */
const TICK_SETUP = {
  candlestick: { size: 1000, rows: 1 },
  performance: { size: 1000, rows: 1 },
  depth: { size: 50, rows: 1 },
  sparkline: { size: 120, rows: 50 },
  live: { size: 0, rows: 100 },
  'live-figure': { size: 0, rows: 100 },
};
const SIZED = new Set(['candlestick', 'performance', 'sparkline']);

rmSync(outDir, { recursive: true, force: true });
await build({
  root: harness,
  logLevel: 'error',
  // The profiling build keeps <Profiler> onRender in production, so commits are counted without dev-mode overhead.
  resolve: { alias: { 'react-dom/client': require.resolve('react-dom/profiling') } },
  build: { outDir, emptyOutDir: true },
});
// Port 0: the OS picks a free port, so this never collides with another preview server.
const server = await preview({ root: harness, logLevel: 'error', build: { outDir }, preview: { host: '127.0.0.1', port: 0 } });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });

async function open() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(url);
  await page.waitForFunction(() => document.title === 'ready');
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return (await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576;
  };
  return { page, heap };
}
const mb = (n) => Math.round(n * 10) / 10;

async function tickRun(scenario, rate) {
  const { size, rows } = TICK_SETUP[scenario];
  const { page, heap } = await open();
  const before = await heap();
  await page.evaluate(([s, n, r]) => window.bench.mount(s, n, r), [scenario, size, rows]);
  const r = await page.evaluate(([ms, ps]) => window.bench.ticks(ms, ps), [SECONDS * 1000, rate]);
  const after = await heap();
  await page.close();
  return { scenario, rate, size, rows, ...r, heapMb: mb(after - before) };
}

async function sizeRun(scenario, size) {
  const rows = scenario === 'sparkline' ? 20 : 1;
  const { page, heap } = await open();
  const before = await heap();
  const mount = await page.evaluate(([s, n, r]) => window.bench.mount(s, n, r), [scenario, size, rows]);
  const cost = await page.evaluate(() => window.bench.tickCost(20));
  const after = await heap();
  await page.close();
  return { scenario, size, rows, ...mount, ...cost, heapMb: mb(after - before) };
}

try {
  const ticks = [];
  for (const s of SCENARIOS) for (const rate of RATES) ticks.push(await tickRun(s, rate));
  const sizes = [];
  for (const s of SCENARIOS.filter((x) => SIZED.has(x))) for (const n of SIZES) sizes.push(await sizeRun(s, n));
  const env = { date: new Date().toLocaleDateString('en-CA'), cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length, os: `${platform()} ${release()}`, node: process.version, chromium: browser.version(), seconds: SECONDS };
  if (json) {
    console.log(JSON.stringify({ env, ticks, sizes }, null, 2));
  } else {
    console.log(`${env.date}, ${env.cpu} (${env.cores} cores), ${env.os}, Node ${env.node}, Chromium ${env.chromium}, ${SECONDS} s per tick run\n`);
    console.log('| Scenario | Ticks/s asked | applied | FPS | Frame mean / p95 / max (ms) | Long tasks (count, ms) | Commits per tick | Commit mean (ms) | Heap (MB) |');
    console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const r of ticks) console.log(`| ${r.scenario} | ${r.rate} | ${r.ticksPerSecond} | ${r.fps} | ${r.frameMeanMs} / ${r.frameP95Ms} / ${r.frameMaxMs} | ${r.longTasks}, ${r.longTaskMs} | ${r.commitsPerTick} | ${r.commitMeanMs} | ${r.heapMb} |`);
    if (sizes.length) {
      console.log('\n| Scenario | Points | Mount commit (ms) | First paint (ms) | DOM nodes | One update mean / p95 (ms) | Heap (MB) |');
      console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
      for (const r of sizes) console.log(`| ${r.scenario}${r.rows > 1 ? ` x${r.rows}` : ''} | ${r.size.toLocaleString('en-US')} | ${r.commitMs} | ${r.paintMs} | ${r.nodes.toLocaleString('en-US')} | ${r.tickMeanMs} / ${r.tickP95Ms} | ${r.heapMb} |`);
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
