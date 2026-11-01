# Performance

Measured numbers for the large-table path, how they were taken and how to reproduce them. Size budgets (gzip per subpath) are enforced separately by `npm run size` ([QUALITY.md](../QUALITY.md)).

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
- Charts and `Live`/`LiveFigure` tweening under high-frequency ticks (still open in the roadmap).

## How the virtual table stays fast

- Fixed row height by default: the window is arithmetic (`scrollTop / rowHeight`), no measuring.
- Only the window plus `overscan` rows (default 8 each side) are drawn; two spacer rows hold the rest of the height.
- The table is `table-layout: fixed` with a `<colgroup>`, so drawing different rows never changes column widths.
- Rows are keyed by `rowKey`, so a live update re-renders only the drawn rows; the caller should replace only the changed row objects and batch updates per animation frame.
- No runtime dependency (TanStack Virtual and similar were not needed for this; see [DEPENDENCY-AUDIT.md](../DEPENDENCY-AUDIT.md)).
