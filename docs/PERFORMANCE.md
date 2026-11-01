# Performance

Measured numbers for the large-table path and for live charts and tweening, how they were taken and how to reproduce them. Size budgets (gzip per subpath) are enforced separately by `npm run size` ([QUALITY.md](../QUALITY.md)).

## Tables: 10,000 rows

`scripts/bench-table.mjs` renders 10,000 synthetic NEPSE trades (`fixtures/trade-data.ts`, seeded, so every run has the same data) in headless Chromium, through the built package (`dist/`), in two tables with the same eight columns:

- `VirtualFinancialTable` (`@punji/ui/virtual-table`): only the rows in view are drawn.
- `FinancialTable` (`@punji/ui/financial`) inside a 600 px scroll box: every row is in the DOM. It is the comparison, not a recommendation for 10,000 rows.

```sh
npm run build
node scripts/bench-table.mjs             # Markdown table, both tables
node scripts/bench-table.mjs --json      # raw numbers
ROWS=100000 MODES=virtual node scripts/bench-table.mjs
```

What each column means:

| Measure | How |
| --- | --- |
| Initial commit | `flushSync(render)` of the whole table, ms. Median of 5 mounts. Data generation is excluded. |
| First paint | From the start of the render to the second animation frame after it, ms (includes waiting for the frame). |
| Scroll FPS, p95 frame | The scroll box moves 120 px every animation frame for 3 s (reversing at the ends). Frames per second and the 95th-percentile frame time. A proxy: headless Chromium caps at 60 FPS, and it does not measure GPU compositing. |
| Updates/s, commit | 1,000 row updates a second for 5 s, batched once per animation frame (about 17 rows per frame), each batch committed synchronously (`flushSync`) so its cost is timed. Every update replaces one row object, as a live price feed would. |
| FPS while updating | Animation frames per second during that run. |

### Results

2026-11-01, Apple M4 Pro (14 cores), macOS 26 (Darwin 25.6.0), Node 24.22.1, Chromium 156.0.8078.4, 10,000 rows, idle machine:

| Table | Rows in DOM | Initial commit (ms) | First paint (ms) | Scroll FPS | Scroll p95 frame (ms) | Updates/s applied | Update commit mean / p95 (ms) | FPS while updating |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VirtualFinancialTable | 22 | 1.7 | 33.3 | 60 | 16.7 | 999.9 | 0.6 / 0.8 | 60 |
| FinancialTable (plain) | 10,000 | 75.3 | 406 | 57.7 | 16.8 | 999.9 | 41.0 / 51.7 | 12.4 |

The same day under load (an emulated linux/amd64 Playwright container running alongside), to show the spread:

| Table | Initial commit (ms) | First paint (ms) | Scroll FPS | Scroll p95 frame (ms) | Update commit mean / p95 (ms) | FPS while updating |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| VirtualFinancialTable | 2.2 to 2.6 | 33.3 to 33.4 | 60 | 16.7 to 16.8 | 1.0 to 1.4 / 2.0 to 4.2 | 59.8 to 60 |
| FinancialTable (plain) | 113 to 115 | 615 to 708 | 31 to 42 | 67 to 133 | 81 to 131 / 236 to 439 | 2.1 to 7.0 |

100,000 rows, `VirtualFinancialTable` only (same machine, under load): 10.3 ms initial commit, 23.6 ms to first paint, 60 FPS scrolling, 1,000 updates a second at 4.9 ms mean (6.8 ms p95) per commit, 60 FPS. The update cost grows with the row count because each new `rows` array is re-keyed once (`rowKey` over every row, O(n)); the drawn rows stay about 22.

Reading the numbers:

- The virtual table's cost tracks the rows in view, not the rows in the data: initial render is about 40 times faster than the plain table at 10,000 rows, and a live batch costs about a millisecond, leaving the frame budget (16.7 ms at 60 Hz) to the rest of the page.
- The plain table holds 60 FPS while scrolling an idle page because the browser only composites, but each live update re-renders 10,000 rows (41 ms or more), so the page drops to about 12 FPS or worse.
- Numbers depend on the machine and its load. Compare runs on one machine; do not compare across machines.

### What is not measured

- Firefox and WebKit; real devices and phones; GPU compositing and paint time beyond frame pacing.
- Memory use, INP, CLS and long-task attribution.
- `measureRows` (measured row heights): uses a ResizeObserver per drawn row and an O(n) prefix sum when a height changes; not benchmarked.
- Charts and `Live`/`LiveFigure` tweening: see [Charts and live tweening](#charts-and-live-tweening).

## How the virtual table stays fast

- Fixed row height by default: the window is arithmetic (`scrollTop / rowHeight`), no measuring.
- Only the window plus `overscan` rows (default 8 each side) are drawn; two spacer rows hold the rest of the height.
- The table is `table-layout: fixed` with a `<colgroup>`, so drawing different rows never changes column widths.
- Rows are keyed by `rowKey`, so a live update re-renders only the drawn rows; the caller should replace only the changed row objects and batch updates per animation frame.
- No runtime dependency (TanStack Virtual and similar were not needed for this; see [DEPENDENCY-AUDIT.md](../DEPENDENCY-AUDIT.md)).

## Charts and live tweening

`scripts/bench-charts.mjs` (`npm run bench:charts`) drives `CandlestickChart`, `PerformanceChart`, `DepthChart`, `Sparkline`, `Live` and `LiveFigure` in headless Chromium through the built package (`dist/`), with seeded synthetic data (`test/bench-charts/main.tsx`). The harness is built against the profiling build of `react-dom` (aliased in the script), so a `<Profiler>` counts every React commit in production mode.

```sh
npm run build
npm run bench:charts                          # Markdown tables
node scripts/bench-charts.mjs --json          # raw numbers
SCENARIOS=candlestick RATES=1000 SIZES=100000 BENCH_SECONDS=2 node scripts/bench-charts.mjs
```

Two runs per scenario:

| Run | Data | What happens |
| --- | --- | --- |
| Ticks | 1,000 candles (SMA 20 and EMA 50); 1,000 dates x 2 series; 50 levels a side; 50 sparklines of 120 closes; 100 `Live` or `LiveFigure` prices | 10, 100 or 1,000 updates a second for 4 s. Each update is its own task (as socket messages arrive), never batched by the harness: React decides how many commits they cost. Candles: the forming (last) candle moves. Performance: the latest value moves. Depth: one level's quantity. Sparkline and Live: one row, round robin, so at 1,000 a second every figure is always tweening. |
| Sizes | 1k, 10k and 100k candles, dates, or closes in each of 20 sparklines | Mount (`flushSync`), first painted frame, DOM nodes, then 20 single updates committed synchronously and timed. |

| Measure | How |
| --- | --- |
| Applied | Updates actually delivered per second. Below the rate asked means the main thread could not keep up. |
| FPS | `requestAnimationFrame` deltas during the run (headless Chromium caps at 60). |
| Long tasks | `PerformanceObserver` `longtask` entries (over 50 ms) during the run. |
| Commits per tick | React commits (Profiler `onRender`) divided by updates. Under 1 means React merged updates into one commit. |
| Commit mean | Profiler `actualDuration` per commit, ms: the React render cost alone, without style, layout and paint. |
| Heap | JS heap after the run minus before the mount, both after a forced GC (CDP `HeapProfiler.collectGarbage`, `Runtime.getHeapUsage`), MB. |

### Results

2026-11-02, Apple M4 Pro (14 cores), macOS 26 (Darwin 25.6.0), Node 24.22.1, Chromium 156.0.8078.4, 4 s per tick run. "Before" is `origin/main` at `9989e08`, "after" is this change: same machine, same day. Expect some noise between runs. The frame-rate dips at 10 a second in the "before" column (candlestick, live-figure) are run-to-run noise; the commit times are not.

Ticks:

| Scenario | Ticks/s | Applied, before → after | FPS, before → after | Commit mean (ms), before → after | Commits per tick (after) | Long tasks, before → after | Heap MB (after) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CandlestickChart | 10 | 10 → 10 | 49.3 → 59.8 | 14.2 → 0.81 | 1 | 7 → 0 | 3.8 |
| CandlestickChart | 100 | 71 → 100 | 53.6 → 59.8 | 8.9 → 0.60 | 1 | 0 → 0 | 3.9 |
| CandlestickChart | 1,000 | 96 → 999 | 59.3 → 59.8 | 7.3 → 0.35 | 0.92 | 0 → 0 | 4.1 |
| PerformanceChart | 10 | 10 → 10 | 59.1 → 59.8 | 22.1 → 0.69 | 1 | 1 → 0 | 2.6 |
| PerformanceChart | 100 | 40 → 100 | 39.6 → 59.8 | 21.9 → 0.71 | 1 | 0 → 0 | 2.7 |
| PerformanceChart | 1,000 | 40 → 1,000 | 39.4 → 59.8 | 22.3 → 0.53 | 0.93 | 0 → 0 | 2.8 |
| DepthChart | 10 | 10 → 10 | 59.8 → 59.8 | 2.3 → 0.37 | 1 | 0 → 0 | 1.3 |
| DepthChart | 100 | 100 → 100 | 59.8 → 59.8 | 2.3 → 0.34 | 1 | 0 → 0 | 1.4 |
| DepthChart | 1,000 | 371 → 1,000 | 59.7 → 59.8 | 2.3 → 0.24 | 0.88 | 0 → 0 | 1.6 |
| Sparkline x50 | 10 | 10 → 10 | 59.8 → 59.8 | 1.24 → 0.11 | 1 | 0 → 0 | 1.0 |
| Sparkline x50 | 100 | 100 → 100 | 50.5 → 59.8 | 1.57 → 0.07 | 1 | 3 → 0 | 1.1 |
| Sparkline x50 | 1,000 | 1,000 → 999 | 59.9 → 59.8 | 0.80 → 0.04 | 0.82 | 0 → 0 | 1.2 |
| Live x100 | 10 | 10 → 10 | 59.5 → 59.8 | 0.08 → 0.06 | 7.2 | 0 → 0 | 1.2 |
| Live x100 | 100 | 100 → 100 | 59.8 → 59.8 | 0.15 → 0.14 | 1.68 | 0 → 0 | 1.4 |
| Live x100 | 1,000 | 999 → 999 | 60.0 → 59.8 | 0.13 → 0.14 | 0.92 | 0 → 0 | 1.4 |
| LiveFigure x100 | 10 | 10 → 10 | 38.6 → 59.8 | 1.25 → 0.09 | 7.0 | 6 → 0 | 1.3 |
| LiveFigure x100 | 100 | 100 → 100 | 60.0 → 59.8 | 0.19 → 0.18 | 1.68 | 0 → 0 | 1.5 |
| LiveFigure x100 | 1,000 | 1,000 → 999 | 59.8 → 59.8 | 0.20 → 0.19 | 0.94 | 0 → 0 | 1.5 |

Frame p95 after the change was 16.7 to 16.8 ms in every tick run (before: up to 33.4 ms for PerformanceChart at 100 and 1,000 a second).

Sizes (one update is the forming candle, the latest date, or one sparkline's line moving on by a close):

| Scenario | Points | Mount commit (ms), before → after | DOM nodes, before → after | One update mean / p95 (ms), before → after | Heap MB, before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| CandlestickChart | 1,000 | 114 → 63 | 4,894 → 4,894 | 9.9 / 13.1 → 1.2 / 2.5 | 4.3 → 3.8 |
| CandlestickChart | 10,000 | 82 → 58 | 5,042 → 5,042 | 11.4 / 13.9 → 2.6 / 3.9 | 6.5 → 6.8 |
| CandlestickChart | 100,000 | 171 → 162 | 5,069 → 5,069 | 30.0 / 41.1 → 15.1 / 28.5 | 27.9 → 36.9 |
| PerformanceChart | 1,000 | 90 → 39 | 4,069 → 2,070 | 23.8 / 29.8 → 1.3 / 2.3 | 3.9 → 2.5 |
| PerformanceChart | 10,000 | 704 → 57 | 40,186 → 2,187 | 256 / 341 → 3.0 / 11.3 | 28.7 → 3.9 |
| PerformanceChart | 100,000 | 8,430 → 142 | 401,370 → 3,371 | 4,107 / 9,310 → 14.6 / 23.8 | 275 → 18.3 |
| Sparkline x20 | 1,000 | 17 → 10 | 41 → 41 | 1.6 / 4.6 → 0.34 / 1.0 | 1.0 → 1.0 |
| Sparkline x20 | 10,000 | 20 → 16 | 41 → 41 | 4.6 / 9.7 → 0.41 / 1.2 | 3.1 → 3.1 |
| Sparkline x20 | 100,000 | 58 → 68 | 41 → 41 | 27.1 / 38.3 → 2.2 / 4.5 | 24.5 → 24.5 |

### What was slow, and the fixes

- **A number formatter built per call.** `PerformanceChart`'s default value formatter and the shared quantity formatter (`CandlestickChart` volume, `DepthChart`) built a new `Intl.NumberFormat` for every cell: about 2,000 per update at 1,000 dates. Each is now built once (as is `MarketHeatmap`'s size formatter).
- **The hidden tables re-rendered every row on every tick.** Both charts' table rows are now memoised: a row re-renders only when its candle, its date's values or a formatter changed, so a tick reformats one row, not 500 or 1,000.
- **`PerformanceChart` listed every date in its hidden table**: 100,000 rows, 400,000 DOM nodes, 8 s to mount. It now lists the latest 500 (`tableLimit`, as `CandlestickChart` already did; `labels.truncated` says so). The chart still draws every date.
- **Candles re-rendered as hundreds of SVG groups per tick.** Each candle is now a memoised mark with pixel positions as props: when the forming candle moves inside the current price range, one mark re-renders.
- **Every candle re-validated per tick.** `validateOhlc` and `Date.parse` ran over every candle on each update. Results are now kept per candle object (a `WeakMap`, checked again if the candle's values changed in place), so a new array with one new candle checks one. The cost is memory: about 9 MB more heap at 100,000 candles.
- **Moving averages over every candle.** A simple moving average is now computed only at the drawn marks (a few hundred), with the same sum in the same order as `sma()`. An EMA still walks every close, as it must.
- **`Sparkline` re-rendered with the same closes.** It is now memoised (still a server-safe module: `memo` is in React's server build), so a watchlist row whose closes did not change skips its line. The reduction to extremes no longer builds a set and sorts it.
- **`Live` tweening** already ran one shared `requestAnimationFrame` loop, with one React commit per frame for every moving figure on the page. Seven commits per tick at 10 a second is the tween's 27 frames spread over the ticks; at 1,000 a second the ticks themselves dominate. It now caches the reduced-motion media query instead of calling `matchMedia` on every change, and stops copying its subscriber set each frame. Commit cost was already about 0.1 to 0.2 ms for 100 figures.

Not changed: at 1,000 ticks a second each tick is still about one React commit, because the app's own `setState` per socket message commits. Merging them is the feed's job: batch per animation frame in the feed, as recommended for tables above, and a chart commits at most 60 times a second.

### Reading the chart numbers

- With live data, keep the old candle objects and replace only the forming one (`[...prev.slice(0, -1), next]`): the per-candle caches and memoised rows depend on object identity.
- At 100,000 candles a tick still costs about 15 ms, because copying the array, aggregating into buckets and the EMA all touch every candle. Aggregate on the server, or with `aggregateByPeriod`, before sending that many to a live chart.
- Pass formatters that keep their identity between renders (module-level functions or `useCallback`): an inline arrow re-renders every table row.

### Regression guard in CI

Wall-clock numbers are not stable on shared CI runners, so `test/chart-performance.test.tsx` counts work instead, and runs in `npm test`:

- a tick on the forming candle at 400 candles may call `formatVolume` at most twice (it was 400);
- a tick on the latest of 1,000 dates may call `formatValue` at most 20 times, and the table holds 500 rows;
- `Sparkline` is a memo component;
- 20 tweening `LiveFigure`s cost at most one React commit per animation frame and settle within 40 frames.

### Not measured for charts

- Firefox, WebKit and phones; GPU and paint cost beyond frame pacing.
- Pointer and keyboard interaction cost (crosshair, readout) under ticks.
- `axis="time"`, more than two moving averages, and `DepthChart` with more than 50 levels a side.
