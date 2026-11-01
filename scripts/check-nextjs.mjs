// Next.js App Router consumer check: pack the library, install the tarball into
// a fresh Next.js app outside this repo, `next build` it and load the built
// pages in headless Chromium. Proves, for the published files:
//   - Server Components can import and call the pure modules (money, format,
//     calculations, chart maths, CSV, Nepal formatting) through subpaths and
//     the root barrel, and render the server-safe components (Sparkline,
//     MoneyDisplay, PriceChange, Figure, Button);
//   - client components (charts, LiveFigure, the virtual table, hooks) carry
//     their own 'use client', so a Server Component can render them directly
//     and a client page can use them with functions as props;
//   - the CSS entry points import through Next's CSS pipeline;
//   - the built pages hydrate with no hydration error, no console error or
//     warning and no page error, and the client page reacts to a click.
// Next itself (and its React) is installed in the temporary app only, never in
// this repo. Needs the npm registry or a warm npm cache, and Chromium from
// Playwright (npx playwright install chromium).
//
//   npm run check:nextjs
//   KEEP=1 npm run check:nextjs     # keep the temporary app for debugging
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/** Pinned so the check is reproducible; bump on purpose (Dependabot does not see it). */
const NEXT_VERSION = '16.4.3';
/** next build typechecks the app and wants Node's types (the major of .nvmrc). */
const TYPES_NODE_VERSION = '24.19.2';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dev = pkg.devDependencies;
const dir = mkdtempSync(join(tmpdir(), 'punji-ui-nextjs-'));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', CI: '1' };
const run = (cmd, args, cwd = dir) => execFileSync(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const write = (file, text) => {
  mkdirSync(join(dir, file, '..'), { recursive: true });
  writeFileSync(join(dir, file), text.trimStart());
};
const freePort = () => new Promise((resolve, reject) => {
  const srv = createServer();
  srv.once('error', reject);
  srv.listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

function app() {
  write('package.json', JSON.stringify({ name: 'punji-ui-nextjs-consumer', private: true, type: 'module', scripts: { build: 'next build', start: 'next start' } }, null, 2));
  write('next.config.mjs', `
import { fileURLToPath } from 'node:url';
// The app's own folder is the root (no parent lockfile is guessed as the workspace).
export default { turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) } };
`);
  write('tsconfig.json', JSON.stringify({
    compilerOptions: { target: 'es2022', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: false, skipLibCheck: false, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'react-jsx', incremental: true, plugins: [{ name: 'next' }] },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts', '.next/dev/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2));

  // Root layout (a Server Component): the CSS entry points go through Next's CSS pipeline.
  write('app/layout.tsx', `
import type { ReactNode } from 'react';
import '@punji/ui/styles.css';
import '@punji/ui/css/financial-charts.css';

export const metadata = { title: 'Punji UI in Next.js' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`);

  // A Server Component: calls pure functions at render (a 'use client' module here would make them
  // client references, and calling one on the server fails the build), renders the server-safe
  // components, and renders client components directly with serialisable props.
  write('app/page.tsx', `
import { formatMoney, nepalMoneyPreset, Button, MoneyDisplay } from '@punji/ui';
import { formatFigure, toneOf } from '@punji/ui/format';
import { formatNPR } from '@punji/ui/nepal/format';
import { allocation, computePosition, valuePosition } from '@punji/ui/calculations';
import { niceTicks, sma } from '@punji/ui/chart-math';
import { toCsv } from '@punji/ui/export';
import { Sparkline } from '@punji/ui/sparkline';
import { PriceChange } from '@punji/ui/price-change';
import { Figure } from '@punji/ui/figures';
import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { PerformanceChart } from '@punji/ui/performance-chart';
import { DepthChart } from '@punji/ui/depth-chart';
import { LiveFigure } from '@punji/ui/live-figure';

const closes = [480, 484, 482, 490, 495, 493, 501, 505, 503, 510];
const dates = closes.map((_, i) => \`2025-11-\${String(i + 10).padStart(2, '0')}\`);
const candles = closes.map((close, i) => ({ date: dates[i]!, open: close - 2, high: close + 3, low: close - 4, close, volume: 1000 + i * 10 }));

export default function Page() {
  const position = computePosition([{ side: 'buy', quantity: 10n, price: 50_000n }], { method: 'fifo', rounding: 'half-even' });
  const value = valuePosition(position, 52_000n);
  const weights = allocation([{ id: 'NABIL', value: 1n }, { id: 'NTC', value: 3n }]);
  const csv = toCsv([{ s: '=1+1' }], [{ header: 'Symbol', accessor: 's' }]);
  const ticks = niceTicks(0, 97, 5).ticks.join(' ');
  const average = sma(closes, 3).at(-1)!.toFixed(2);
  return (
    <main>
      <h1>Server page</h1>
      <p data-testid="pure">{[formatMoney(123456n, nepalMoneyPreset), formatNPR(1234567.89), formatFigure(1234.5, 'rs'), toneOf(-1), ticks, average, JSON.stringify(weights.map((w) => w.id)), csv.split('\\r\\n')[1]].join(' | ')}</p>
      <p data-testid="position">{String(value.marketValue)}</p>
      <Button>Buy</Button>
      <MoneyDisplay value={123456n} currency="NPR" />
      <PriceChange current={10_500n} previous={10_000n} currency="NPR" />
      <Figure value={1234.5} kind="rs" />
      <Sparkline values={closes} label="NABIL, up over 10 sessions" />
      <CandlestickChart candles={candles} label="NABIL daily" averages={[{ type: 'sma', window: 3 }]} />
      <PerformanceChart dates={dates} series={[{ key: 'p', label: 'Portfolio', values: closes }, { key: 'n', label: 'NEPSE', values: closes.map((c) => c * 5.4) }]} label="Return" />
      <DepthChart bids={[{ price: 500, quantity: 100 }, { price: 499.5, quantity: 300 }]} asks={[{ price: 501, quantity: 150 }, { price: 502, quantity: 80 }]} label="Depth" />
      <LiveFigure value={503.5} kind="rs" testId="live" />
    </main>
  );
}
`);

  // A client page: hooks, render props and functions as props, state that changes after hydration.
  write('app/client/page.tsx', `
import { Watch } from './watch';

export default function ClientPage() {
  return <main><h1>Client page</h1><Watch /></main>;
}
`);
  write('app/client/watch.tsx', `
'use client';
import { useState } from 'react';
import { Button, Live, Sparkline, VirtualFinancialTable, useDebounce } from '@punji/ui';
import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { useHydrated } from '@punji/ui/use-hydrated';

interface Row { id: string; symbol: string; ltp: number }
const rows: Row[] = Array.from({ length: 2000 }, (_, i) => ({ id: \`R\${i}\`, symbol: ['NABIL', 'NTC', 'NICA', 'HDL'][i % 4]!, ltp: 400 + (i % 97) }));
const candles = Array.from({ length: 120 }, (_, i) => ({ date: \`2025-\${String(1 + Math.floor(i / 28)).padStart(2, '0')}-\${String(1 + (i % 28)).padStart(2, '0')}\`, open: 500 + i, high: 505 + i, low: 495 + i, close: 502 + i, volume: 1000 }));

export function Watch() {
  const [price, setPrice] = useState(500);
  const shown = useDebounce(price, 0);
  const hydrated = useHydrated();
  return (
    <section>
      <p data-testid="hydrated">{hydrated ? 'hydrated' : 'server'}</p>
      <Button onClick={() => setPrice((p) => p + 1)} testId="tick">Tick</Button>
      <Live value={price} testId="price">{(n) => (n ?? 0).toFixed(2)}</Live>
      <span data-testid="debounced">{shown}</span>
      <Sparkline values={[1, 3, 2, price]} />
      <CandlestickChart candles={candles} label="Daily" formatPrice={(p) => p.toFixed(1)} />
      <VirtualFinancialTable caption="Quotes" rows={rows} rowKey={(r) => r.id} emptyTitle="None" height={300} columns={[
        { key: 'id', label: 'Id', rowHeader: true, render: (r) => r.id },
        { key: 'symbol', label: 'Symbol', render: (r) => r.symbol },
        { key: 'ltp', label: 'LTP', num: true, render: (r) => r.ltp.toFixed(2) },
      ]} />
    </section>
  );
}
`);
}

async function browse(port) {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
  const problems = [];
  try {
    for (const path of ['/', '/client']) {
      const page = await browser.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') problems.push(`${path} console ${m.type()}: ${m.text()}`);
      });
      page.on('pageerror', (e) => problems.push(`${path} page error: ${e.message}`));
      const res = await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' });
      if (!res?.ok()) problems.push(`${path}: HTTP ${res?.status()}`);
      const html = await res.text();
      // The server HTML must already hold the content (rendered on the server, not after hydration).
      if (path === '/') {
        for (const needle of ['12,34,567.89', 'kit-spark', 'kit-ct', 'Buy']) if (!html.includes(needle)) problems.push(`/ server HTML is missing ${needle}`);
        const pure = await page.getByTestId('pure').textContent();
        if (!pure?.includes("'=1+1")) problems.push(`/ pure modules gave ${pure}`);
      } else {
        await page.getByTestId('hydrated').filter({ hasText: 'hydrated' }).waitFor({ timeout: 10_000 });
        await page.getByTestId('tick').click();
        await page.getByTestId('price').filter({ hasText: '501.00' }).first().waitFor({ timeout: 10_000 });
        const drawn = await page.locator('tbody tr[data-index]').count();
        if (drawn === 0 || drawn > 60) problems.push(`/client virtual table drew ${drawn} rows (expected a screenful)`);
      }
      // Give late hydration errors (they are reported asynchronously) a moment to arrive.
      await page.waitForTimeout(500);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return problems;
}

let server;
try {
  run('npm', ['pack', '--pack-destination', dir, '--ignore-scripts'], root);
  const tarball = readdirSync(dir).find((file) => file.endsWith('.tgz'));
  app();
  run('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--ignore-scripts',
    `next@${NEXT_VERSION}`, `react@${dev.react}`, `react-dom@${dev['react-dom']}`,
    `typescript@${dev.typescript}`, `@types/react@${dev['@types/react']}`, `@types/react-dom@${dev['@types/react-dom']}`, `@types/node@${TYPES_NODE_VERSION}`, `./${tarball}`]);
  const out = run('npx', ['next', 'build']);
  const port = await freePort();
  server = spawn('npx', ['next', 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`next start did not get ready in 60 s\n${log}`)), 60_000);
    const check = () => (/ready|started server|Local:/i.test(log) ? (clearTimeout(timer), resolve()) : setTimeout(check, 200));
    server.once('exit', (code) => reject(new Error(`next start exited (${code})\n${log}`)));
    check();
  });
  const problems = await browse(port);
  if (/error|warn/i.test(log.replace(/NEXT_TELEMETRY|telemetry/gi, ''))) problems.push(`next start logged:\n${log}`);
  if (problems.length) throw new Error(problems.join('\n'));
  const routes = (out.match(/^[├└┌]\s+[○ƒ●]\s+\S+/gm) ?? []).length;
  console.log(`nextjs: ${tarball} in Next.js ${NEXT_VERSION} App Router: next build passes (${routes} routes); server components call pure modules and render client components; CSS imports; pages hydrate with no errors or warnings`);
} catch (error) {
  console.error(`Next.js check failed in ${dir}\n${error.stdout ?? ''}${error.stderr ?? error.message}`);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  }
  if (!process.exitCode && !process.env.KEEP) rmSync(dir, { recursive: true, force: true });
}
