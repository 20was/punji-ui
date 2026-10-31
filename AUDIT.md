# Audit and findings

State of the repository at `cfe3d47`. Original audit (2026-10-28): [docs/audit/README.md](docs/audit/README.md), kept as written. This page consolidates it with what was found afterwards. Evidence for the web comparison is in [COMPONENT-INVENTORY.md](COMPONENT-INVENTORY.md) and [docs/INTEGRATION.md](docs/INTEGRATION.md).

Severity: **P0** blocks any release or causes data loss; **P1** blocks production use; **P2** quality gap; **P3** polish. Status: **fixed**, **partial**, **open**.

## Summary

| Status | Findings |
| --- | --- |
| Fixed | Ownership of `src/`, public API drift, calculations layer, Nepal-locked money, visual regression, divergence in shared modules, Button new-tab |
| Partial | Packaging (publishable, never published), web-only modules (10 of 96 migrated), tables/charts/accounting/market compositions, browser a11y coverage, size budgets |
| Open | Docs portal still lives in punji-web (P1), duplicates inside punji-web, six visual defects, manual screen-reader testing, first publish |

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
| Size budget creep | Aggregate budget grew from 11.5 kB to 21 kB (docs/ARCHITECTURE.md) and is now 45 kB gzip in `.size-limit.json`; tarball allowance 320 to 400 KiB to 680 KiB (`scripts/check-pack.mjs`) | P2 | Open | Budgets were raised with each module batch rather than held. Per-subpath budgets (89 entries) still guard consumers who import subpaths. No ceiling policy yet. Current measured sizes not re-run for this page |
| Contrast coverage | jsdom axe disables colour contrast | P2 | Fixed | Contrast now checked by axe in the Playwright a11y spec (390 and 1440, both themes) |

### Open visual defects

Reported by the visual-regression review of the new gate. They are **not recorded elsewhere in the repository** ([docs/VISUAL-TESTING.md](docs/VISUAL-TESTING.md) lists only gate limits) and were not re-verified for this page. Already fixed by `visual-regression-css-fixes`: `ValueRow` without `lead` squeezing its figure, and `Card tone="inverse"` surface.

| Component | Defect | Sev | Status |
| --- | --- | --- | --- |
| `Card` | Meta text wraps badly in narrow cards | P2 | Open |
| `ChoiceGroup` | Compact selected state is invisible against the page background in dark theme | P2 | Open |
| `DateRangePicker` | Truncates in narrow containers | P2 | Open |
| `PriceChart` | Plot height too small at 390 px | P2 | Open |
| `OrderBook` | At 390 px a column is clipped with no scroll affordance | P2 | Open |
| Overlays | Inherit the page font instead of the token font | P3 | Open |

## Still not done

- Complete manual per-component audit using [docs/audit/component-matrix.md](docs/audit/component-matrix.md); native Nepali copy review; independent calendar anchors.
- Manual screen-reader testing (VoiceOver, NVDA); cross-browser visual comparison (Chromium only).
- First npm release, Trusted Publisher setup, docs hosting decision.
- punji-web switching to the published package (not started).
