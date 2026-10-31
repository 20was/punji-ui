# Audit and findings

State of the repository at `cfe3d47`. Original audit (2026-10-28): [docs/audit/README.md](docs/audit/README.md), kept as written. This page consolidates it with what was found afterwards. Evidence for the web comparison is in [COMPONENT-INVENTORY.md](COMPONENT-INVENTORY.md) and [docs/INTEGRATION.md](docs/INTEGRATION.md).

Severity: **P0** blocks any release or causes data loss; **P1** blocks production use; **P2** quality gap; **P3** polish. Status: **fixed**, **partial**, **open**.

## Summary

| Status | Findings |
| --- | --- |
| Fixed | Ownership of `src/`, public API drift, calculations layer, Nepal-locked money, visual regression (73 fixtures, 640 baselines; 43 added since the gate was built), divergence in shared modules, Button new-tab, the visual and accessibility defects listed below (eleven from the gate extension, seven from the final pass) |
| Partial | Packaging (publishable, never published), web-only modules (17 of 96 migrated; see COMPONENT-INVENTORY.md), tables/charts/accounting/market compositions, browser a11y coverage, size budgets |
| Open | Docs portal still lives in punji-web (P1), duplicates inside punji-web, manual screen-reader testing, first publish |

Nothing is published to npm (`version` is `0.0.0`). The package is not production ready.

## Findings

### From the original audit

| Area | Finding | Sev | Status | Notes |
| --- | --- | --- | --- | --- |
| Ownership of source | Scheduled reverse sync from punji-web overwrote library code; CI rejected direct edits | P0 | Fixed | `src/` is owned here. `scripts/sync-from-web.mjs` throws on purpose (`npm run sync`) |
| Public API | Root did not export every subpath module | P0 | Fixed | `npm run check:exports` compares every subpath value with the root |
| Packaging | `private: true` | P0 | Partial | Manifest is publishable (`publishConfig` access public, provenance). Release is gated; nothing published. See [RELEASE.md](RELEASE.md) |
| Examples | No runnable examples against the built package | P0 | Partial | `examples/` (portfolio, invoice, watchlist) built and typechecked in CI. No full gallery |
| Nepal utilities | No BS conversion, fiscal years, NPR money | P1 | Fixed | `nepal/*`, `Calendar`, `DatePicker`, `DateRangePicker` ([docs/CALENDAR.md](docs/CALENDAR.md)). Native Nepali copy review still pending |
| Shell | Web shell depends on site conventions | P1 | Partial | Generic `AppShell` exists; complex mobile menus and workspace layouts do not |
| Tables and filters | No pagination, search, selection | P1 | Partial | `DataTable`/`FinancialTable` have controlled search, selection, pagination ([docs/TABLES.md](docs/TABLES.md)). Composable filters, `RowMenu` missing |
| Charts | Most chart components missing | P1 | Partial | `PriceChart` only. TrendChart, CandleChart, EquityChart, ReturnBars not extracted |
| Market workflows | No OrderBook, quote or alert compositions | P1 | Partial | `OrderBook` and `OrderBookDepth` (display only). Quote hero, alerts missing |
| Accounting | No journal, reconciliation, invoice editor | P1 | Open | Summary and table foundation plus invoice example only |
| States | Duplicated loading/error/empty components | P1 | Partial | `EmptyState`, `Skeleton`, `Note`, `RetryNote`, `InlineState` in the kit; web duplicates remain |
| Accessibility | Incomplete browser evidence | P1 | Partial | axe in jsdom plus real-browser axe and keyboard specs; no manual assistive-technology testing. See [QUALITY.md](QUALITY.md) |
| Supply chain | Preserve pinned deps, provenance, lock checks | P1 | Fixed | One runtime dependency, exact-pinned and allowlisted. [DEPENDENCY-AUDIT.md](DEPENDENCY-AUDIT.md) |

### Found since

| Area | Finding | Sev | Status | Notes |
| --- | --- | --- | --- | --- |
| Docs portal ownership | The design site (`design.punji.app`, about 35 pages) is `src/design` in punji-web and is served by its Worker. `npm run portal` patches that checkout in memory; there is no independent portal build or deploy here | P1 | Open | Target and steps: [docs/INTEGRATION.md](docs/INTEGRATION.md) section 8. Docs hosting is an open owner decision |
| Calculations layer | No exact position accounting or ratios | P1 | Fixed | `src/calculations/` (bigint minor units, explicit `RoundingMode`; ratios are display-only `number`). [docs/FINANCIAL.md](docs/FINANCIAL.md) |
| Nepal-locked money | Formatters assumed NPR, `Rs` and `en-IN` | P1 | Fixed | `@punji/ui/money` is currency-generic (exponent from Intl); `MoneyDisplay`, `PriceChange`, `CurrencyInput`. Legacy `formatNPR` kept. Nepal is a preset |
| No visual regression | No screenshot or real-browser a11y gate | P1 | Fixed locally | Playwright in the pinned Docker image; baselines committed under `test/visual/__screenshots__/`. The CI `visual` job exists in `ci.yml` but **has not been run on GitHub yet** |
| punji-web divergence | Button, Card, Layout, Rows, StatusPill, ListFilter, CompanySearch, compact, OrderBook diverged with web ahead | P1 | Fixed for shared modules | Closed in `4b8e5e5`. Select, Popover, Fields, Table: punji-ui is ahead. Fidelity beyond named exports is not proven |
| Web-only reusable modules | 96 of 167 kit modules in punji-web are reusable and absent here (P1 18, P2 15, P3 63) | P1 | Partial | 10 migrated: `CardLink`, `RetryNote`, `Meter`, `SummaryFigure`, `CheckRow`, `InlineState`, `KeyStats`, `FactList`, `StepList`, `LinkTable`. Not yet: `MetricTile`, `Bars`/`SplitBar`, `Sparkline`, `Pagination`, `ColumnChart`, `Breakdown`, and the rest of the 96. Counts are from the 2026-10-31 inventory and are not regenerated |
| Duplicates inside punji-web | 12 families: formatting stacks, Delta/Figure, three Skeletons, alert distance, 21 files calling `window.matchMedia` directly, Sparkline, five icon sets, FAQ/disclosure, dead look-alikes, error/empty states, market status, copies of punji-ui hooks | P2 | Open | Lives in punji-web; resolved by migration order in INTEGRATION.md. Eight dead-code candidates listed in the inventory |
| Button new tab | Web links opened a new tab and announced it; punji-ui did not | P1 | Fixed | `external` and `newTabLabel` props (`ce18320`) |
| Size budget creep | Aggregate budget grew from 11.5 kB to 21 kB (docs/ARCHITECTURE.md) and is now set in `.size-limit.json` (48.3 kB measured on 2026-10-31); tarball allowance grew from 320 KiB to the value in `scripts/check-pack.mjs` (732 kB measured) | P2 | Open | Budgets were raised with each module batch rather than held. Per-subpath budgets (89 entries) still guard consumers who import subpaths. No ceiling policy yet. Current measured sizes not re-run for this page |
| Contrast coverage | jsdom axe disables colour contrast | P2 | Fixed | Contrast now checked by axe in the Playwright a11y spec (390 and 1440, both themes) |

### Visual defects

Found by the visual-regression review, then fixed when the gate was extended to every component added since it was built (`test/visual/fixtures-kit.tsx`). Each was reproduced by a screenshot before the change and checked after it. Already fixed earlier by `visual-regression-css-fixes`: `ValueRow` without `lead` squeezing its figure, and `Card tone="inverse"` surface.

| Component | Defect | Sev | Status | Fix |
| --- | --- | --- | --- | --- |
| `Card` | Meta text wraps jammed against the title in a narrow card | P2 | Fixed | The header title becomes a wrapping flex line when it has meta, so meta moves to its own line as a unit (`card.css`) |
| `Card` header | `ColumnLegend` (three series) overlaps the title at 390 px | P2 | Fixed | Header wraps; the action drops under the title when it does not fit (`card.css`) |
| `ChoiceGroup` | Compact selected pill invisible on the page in dark theme | P2 | Fixed | Dark selected pill uses `--pu-color-surface-tint` with a `--pu-color-border-strong` ring (`choice-group.css`) |
| `DateRangePicker` | Fields side by side truncate the placeholder in a narrow container | P2 | Fixed | Stacks under a 340 px container width, by container query (`calendar.css`) |
| `PriceChart` | Plot about 40 px tall at 390 px; labels crowd the title | P2 | Fixed | SVG stretches (`preserveAspectRatio="none"`, non-scaling stroke) to 180 px under 520 px wide; title and labels spaced (`financial.css`, `financial.tsx`) |
| `OrderBook` | At 390 px the last column is clipped with no scroll affordance | P2 | Fixed | Smaller cell padding and wrapping heads under 480 px so four columns fit down to 320 px; a scroll shadow shows when it still overflows (`financial.css`, wrapper `div` in `financial.tsx`) |
| Overlays | Inherit the page font instead of the token font | P3 | Fixed | `--pu-font-body` on sheet, drawer, toast, command palette, company-search sheet, popover and tooltip roots (`overlay.css`) |
| `Pagination` | `0 of 0` still shows one page button | P3 | Fixed | No page buttons when `total` is 0 (`Pagination.tsx`, unit test) |
| `Card size="lg"` | `meta` inherits the 24 px title size | P3 | Fixed | 15 px meta in a large card (`card.css`) |
| `ShareBar` | Two-column legend truncates names in a card under 300 px | P2 | Fixed | One column under a 300 px container (`meter.css`) |
| `KeyStats` | Three columns overlap values in a card under 320 px | P2 | Fixed | Columns fall to two below 96 px per column (`key-stats.css`) |
| `CompanySearch` | Loading state: `role="listbox"` with no options (axe `aria-required-children`, critical) | P1 | Fixed | The listbox renders only when there are options; the loading and empty messages sit in the plain wrapper that `aria-controls` names (`CompanySearch.tsx`, unit test with axe) |
| `Watchlist` | At 390 px the rows were wider than the list (about 80 px) and the move and remove buttons clipped | P1 | Fixed | `min-width: 0` on the row, so a grid parent cannot size it to its content (`watchlist.css`); the docs site's `.doc-section ul` no longer styles component lists (`site/src/styles.css`); the site check now fails when a preview scrolls sideways |
| `StockTable` (and `TrialBalance`, `StatementTable`, `LedgerTable`) | Error state drew a retry button with no `onRetry`; pressing did nothing | P2 | Fixed | `RetryNote` draws the button only when `onRetry` is given; prop comments updated (unit test) |
| `DataTable`, `StockTable` | Select-all header cell empty in the stacked layout (axe `empty-table-header`) | P1 | Fixed | Visually hidden text in the header cell in every layout (`Table.tsx`, unit test with axe) |
| `EmptyState` | Title always an `h2`, breaking the heading order inside a Card | P2 | Fixed | `headingLevel` prop (2, 3 or 4; default 2), like `StepList` (`States.tsx`, unit test) |
| `StockTable` | Stacked rows: LTP clipped at the card edge (one narrow track), rows flush to the box border, Trend header misaligned with its lines at 1440 | P1 | Fixed | The LTP gets two tracks, a boxed stacked table pads its rows 12 px, the trend lines sit under their head (`stock-table.css`, `table.css`) |
| `StockTable` with `maxHeight` | At under 640 px the stacked box did not scroll: rows spilled out of it | P2 | Fixed | The stacked box scrolls vertically (`stock-table.css`); found by the new site layout check |
| `MarketHeatmap` | Symbol and change text cut off without a mark in small tiles | P3 | Fixed | Ellipsis in the tile (`market-heatmap.css`); found by the new site layout check |
| `LedgerTable` | Stacked layout without the Ref column right-aligned the description | P2 | Fixed | Description cell is left aligned and wraps (`accounting.css`) |
| `RetryNote` | Button left under the message when it wraps, right when it does not | P3 | Fixed | The row no longer wraps: the message shrinks and wraps, the button stays at the end (`retry-note.css`) |
| `LinkTable` | Rows in a flush `Card` inset 8 px from the card title | P3 | Fixed | `.kit-card.flush > .kit-lt` adds 8 px so row text lines up with the title (`link-table.css`) |

Still open, minor: `CheckRow` with an `action` and no figure stacks the action under the text on phones, offset by the button padding. The compact `ChoiceGroup` change is below the screenshot tolerance in the existing `controls` baseline, so that baseline is unchanged; `choice-compact-page` covers it.

## Still not done

- Complete manual per-component audit using [docs/audit/component-matrix.md](docs/audit/component-matrix.md); native Nepali copy review; independent calendar anchors.
- Manual screen-reader testing (VoiceOver, NVDA); cross-browser visual comparison (Chromium only).
- First npm release, Trusted Publisher setup, docs hosting decision.
- punji-web switching to the published package (not started).
