// The tarball gate: only dist JS, types and CSS (plus the files npm always
// adds) may ship. No source maps, no sources, no images or brand assets, no
// dotfiles, and an upper bound on the unpacked size.
import { execFileSync } from 'node:child_process';

// Calendar/date pickers and the expanded financial table API add JS,
// declarations and dedicated CSS. Keep a bounded allowance above the current
// measured ~451 kB unpacked rather than letting the budget fail on valid output.
// Hooks, CSV export, calculations and the generic money module with its three
// primitives (JS, declarations, CSS) bring the measured size to ~549 kB; keep a
// modest allowance above that and re-measure when adding modules.
// The ten migrated status, meter and list components plus the web-parity work
// (JS, declarations, CSS) bring it to ~649 KiB.
// The second batch (HeadlineFigure, bars, Sparkline, ColumnChart, Breakdown, Pagination,
// MetricTile: JS, declarations, CSS) brings it to ~713 KiB.
// .size-limit.json takes no comments: the "Everything" budget went 45 -> 49 kB gzip (about +3.2 kB of real new JS) and
// styles.css 18.4 -> 20.4 kB gzip (about +1.6 kB of CSS) for the same second batch.
// The market components (StockTable, MarketMovers, MarketIndices, MarketStatus, PriceLimitIndicator,
// Watchlist, MarketHeatmap: JS, declarations, CSS) add ~88 kB, bringing it to ~802 KiB.
// The accounting components (ledger helpers, DebitCredit, LedgerTable, JournalEntryView, TrialBalance, StatementTable,
// PaymentStatus, FinancialPeriodSelector: JS, declarations, CSS) add ~75 kB, bringing it to ~883 KiB (904,546 B).
// The portfolio compositions (HoldingsTable, PortfolioAllocation, PortfolioOverview, DividendHistory, TransactionHistory and the
// pure helpers: JS, declarations with prop docs, CSS) bring the measured size to 1,041,164 B on 2026-11-01: budget 960 -> 1056 KiB.
// Prop doc comments enlarge declarations; merged total measured 913,958 B on 2026-10-31.
// The banking components (pure helpers, AccountNumber, BankAccountCard, TransactionList, TransactionStatus, PaymentReceipt,
// PaymentTimeline, BeneficiarySelector: JS, declarations with prop docs, CSS) add ~90 kB; measured 1,031,009 B (1007 KiB).
// The financial charts (chart-math, CandlestickChart, PerformanceChart, DepthChart: JS, declarations with prop docs, CSS) add ~75 kB, measured 1,024,197 B.
// Banking and charts merged together: measured 1,120,613 B; ~3% headroom.
// Banking, charts and portfolio merged: measured 1,232,502 B; ~3% headroom.
// Wave 3 table scale (VirtualFinancialTable, TableExport: JS, declarations, CSS): measured 1,386,061 B; ~3% headroom.
const MAX_UNPACKED = 1410 * 1024;
const [info] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
const always = new Set(['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md']);
const allowed = (p) => always.has(p) || /^dist\/.+\.(js|d\.ts|css)$/.test(p);

if (!info.files.some(file => file.path === 'THIRD_PARTY_NOTICES.md')) throw new Error('pack: missing required upstream licence notices');

const bad = info.files.map((f) => f.path).filter((p) => !allowed(p));
for (const f of info.files) console.log(`  ${String(f.size).padStart(7)}  ${f.path}`);
console.log(`pack: ${info.files.length} files, ${info.size} B packed, ${info.unpackedSize} B unpacked`);

if (bad.length) {
  console.error(`pack: files that must not ship:\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
if (info.unpackedSize > MAX_UNPACKED) {
  console.error(`pack: unpacked ${info.unpackedSize} B is over the ${MAX_UNPACKED} B budget`);
  process.exit(1);
}
