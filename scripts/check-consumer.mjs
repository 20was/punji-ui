// Release check: install the packed tarball into a fresh consumer outside this
// repo, then typecheck with strict TypeScript, render on the server, run pure
// utilities in Node and build with Vite. Catches problems the in-repo checks
// cannot see (export map, declarations, CSS imports, SSR, peer resolution).
// Needs the npm registry or a warm npm cache for react, typescript and vite.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dev = pkg.devDependencies;
const dir = mkdtempSync(join(tmpdir(), 'punji-ui-consumer-'));
const run = (cmd, args, cwd = dir) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });

try {
  run('npm', ['pack', '--pack-destination', dir, '--ignore-scripts'], root);
  const tarball = readdirSync(dir).find((file) => file.endsWith('.tgz'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'es2022', lib: ['es2023', 'dom'], module: 'nodenext', moduleResolution: 'nodenext', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: false, types: [] },
    include: ['src'],
  }));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/app.tsx'), `
import { Button, MoneyDisplay, PriceChange, StockTable, computePosition, formatMoney } from '@punji/ui';
import { allocation, valuePosition } from '@punji/ui/calculations';
import { useDebounce } from '@punji/ui/hooks';
import { toCsv } from '@punji/ui/export';
import { formatNPR } from '@punji/ui/nepal/format';
import { MarketStatus, getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import '@punji/ui/styles.css';
import '@punji/ui/css/money.css';

const position = computePosition([{ side: 'buy', quantity: 10n, price: 50_000n }], { method: 'fifo', rounding: 'half-even' });
export const value = valuePosition(position, 52_000n);
export const shares = allocation([{ id: 'NABIL', value: 1n }, { id: 'NTC', value: 2n }]);
export const csv = toCsv([{ s: '=1+1' }], [{ header: 'Symbol', accessor: 's' }]);
export const text = [formatNPR(1234567.89), formatMoney(123456n, { currency: 'USD', locale: 'en-US' })];
// @ts-expect-error a money component needs a currency or a preset
export const missingCurrency = <PriceChange current={1n} previous={1n} />;
export function App() {
  const symbol = useDebounce('NABIL', 200);
  return (<>
    <Button>{symbol}</Button>
    <MoneyDisplay value={123456n} currency="NPR" />
    <PriceChange current={105_00n} previous={100_00n} currency="NPR" />
    <MarketStatus session={getMarketSession(new Date(), nepseSchedule)} />
    <StockTable quotes={[]} caption="Quotes" />
  </>);
}
`);
  writeFileSync(join(dir, 'src/main.tsx'), `import { createRoot } from 'react-dom/client';\nimport { App } from './app.js';\ncreateRoot(document.getElementById('root')!).render(<App />);\n`);
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html lang="en"><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
  writeFileSync(join(dir, 'ssr.mjs'), `
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import * as ui from '@punji/ui';
import { toCsv } from '@punji/ui/export';
const html = renderToString(h('div', null, h(ui.Button, null, 'Buy'), h(ui.MoneyDisplay, { value: 123456n, currency: 'NPR' }), h(ui.PriceChange, { current: 10500n, previous: 10000n, currency: 'USD' })));
if (!html.includes('Buy')) throw new Error('SSR output missing content');
const rows = Array.from({ length: 10000 }, (_, i) => ({ id: 'T' + i }));
const virtual = renderToString(h(ui.VirtualFinancialTable, { caption: 'Trades', rows, rowKey: (r) => r.id, emptyTitle: 'None', height: 400, rowHeight: 40, overscan: 2, columns: [{ key: 'id', label: 'Id', render: (r) => r.id }] }));
if (!virtual.includes('aria-rowcount="10001"') || (virtual.match(/data-index=/g) ?? []).length !== 11) throw new Error('VirtualFinancialTable SSR should draw only the first screenful');
if (toCsv([{ s: '=1+1' }], [{ header: 'S', accessor: 's' }]) !== "S\\r\\n'=1+1") throw new Error('CSV formula neutralisation changed');
console.log(String(Object.keys(ui).length));
`);
  run('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--ignore-scripts',
    `react@${dev.react}`, `react-dom@${dev['react-dom']}`, `@types/react@${dev['@types/react']}`, `@types/react-dom@${dev['@types/react-dom']}`,
    `typescript@${dev.typescript}`, `vite@${dev.vite}`, `./${tarball}`]);
  run('npx', ['tsc', '-p', '.']);
  const exports = run('node', ['ssr.mjs']).trim();
  run('npx', ['vite', 'build', '--logLevel', 'error']);
  console.log(`consumer: ${tarball} installs cleanly; strict tsc, SSR (${exports} root exports, virtual table first screenful), CSV safety and Vite build pass`);
} catch (error) {
  console.error(`consumer check failed in ${dir}\n${error.stdout ?? ''}${error.stderr ?? error.message}`);
  process.exitCode = 1;
} finally {
  if (!process.exitCode) rmSync(dir, { recursive: true, force: true });
}
