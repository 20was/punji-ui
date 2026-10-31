# Financial design-system audit and implementation backlog

Date: 2026-10-28. This is an initial source audit, not a claim of exhaustive visual/behavioral parity. Run `npm run audit:web -- /path/to/punji-web` to refresh [component matrix](component-matrix.md) and [machine-readable inventory](inventory.json). Inventory includes 246 component files and 247 page/example files with imports. A matching export name does not prove API, styling or accessibility parity. Both local repositories were accessible; the remote design site could not be opened by the web research tool.

## Findings and priorities

| Area | Evidence / gap | Priority and result |
|---|---|---|
| Ownership | Scheduled reverse sync overwrote library code; generated-files CI rejected direct changes | P0 fixed: library owns src, reverse sync retired, consumer untouched |
| Public API | README advertised PanelTabs and other modules not exported at root; subpath-only modules existed | P0 fixed: all runtime subpath exports checked against root; no removed API |
| Packaging | private=true, valid ESM/types/CSS and existing strong CI | P0: publishable manifest, release remains explicitly gated; pack/import validation added |
| Examples | Public docs belong to web app; library has no runnable examples | P0: independent package-importing showcase, build/typecheck; full gallery still missing |
| Nepal | Existing formatFigure/parseNumber/compactRs, no package BS conversion/fiscal utility | P1: explicit Nepal locale/calendar/money utilities; legacy APIs preserved |
| Shell/navigation | Web SiteHeader/SiteFooter/AppTabBar/WorkspacePanel depend on site conventions | P1: generic AppShell added; complex mobile menus and workspace layouts pending |
| Tables/filters | Low-level DataTable lacked pagination, search and selection controls; FilterMenu and RowMenu missing | P1: responsive/sticky styles and controlled search, page selection and pagination now ship with DataTable and FinancialTable; filtering, sorting, selection state and queries remain caller-owned; advanced filter UX pending |
| Charts | Helpers exported but most chart components missing (TrendChart, CandleChart, EquityChart, ReturnBars etc.) | P1: PriceChart with gaps/data alternative added; specialised chart parity pending |
| Market workflows | OrderBook, QuoteHero, watchlist/alert compositions absent | P1: display-only OrderBook added; quote/range/alert composition extraction pending |
| Accounting | Consumer benchmark itself lacks complete accounting UI | P1: summary/table and invoice example foundation; journal, reconciliation, tax-aware invoice editing and reports pending |
| States | Existing EmptyState, Skeleton, Note; some duplicated data components outside kit | P1: composed loading/error/empty states, source inventory; duplication consolidation pending |
| Accessibility | Existing axe/unit tests; incomplete browser evidence | P1: new semantics/state/escaping tests and browser matrix; full keyboard/mobile/overlay audit pending |
| Supply chain | Pinned dependencies/Actions, provenance, signatures, lock integrity | Preserve; one MIT calendar runtime dependency documented and pinned |

## Checklist

Completed in this branch:
- [x] Read consumer kit, registry, portfolio/watchlist/alert layout inventory, package scripts and repository instructions.
- [x] Reproducible component/import inventory with pinned consumer revision.
- [x] Retire reverse sync and generated-source restriction without consumer migration.
- [x] Repair root export coverage, add runtime public API gate.
- [x] Add shell, summary, financial table, price chart and order-book compositions.
- [x] Add supported-range BS conversion, month names, fiscal years, timezone-aware AD display, NPR/grouping/digits and exact decimal utilities.
- [x] Add behavioral, invalid-input, round-trip and accessibility tests.
- [x] Add package-based portfolio, invoice and watchlist showcases.
- [x] Document architecture, upstream source/licence review and release boundary.
- [x] Implement Calendar, DatePicker and DateRangePicker with AD/BS display, strict date-only form contracts, keyboard interaction, full portal examples and responsive theme checks. See [calendar scope and remaining release checks](../CALENDAR.md).

Next, in order:
1. Complete manual per-component and per-page audit using the generated matrix. Record exact API/CSS/keyboard differences, not only names.
2. Build a full local documentation gallery for every public export, preserving working web examples without importing web business logic. Document sizes, variants, states and props.
3. Extend existing table with composable filters; extract RowMenu and destructive-confirm flows with keyboard/focus tests.
4. Add reusable holdings/transaction/dividend/IPO/alert detail compositions and genuinely complete workflows, including odd/missing data. Do not multiply nearly identical widgets merely for count.
5. Add journal entry, invoice editor, expenses, balances and P&L/report schemas as display interfaces; keep calculations/tax rules external.
6. Extract proven chart components with explicit empty/missing/constant/outlier behavior, accessible data alternatives and bounded responsive sizing.
7. Native Nepali copy review, more independent official calendar anchors and dependency calendar-data provenance review.
8. Expand the existing portfolio browser matrix to every gallery/workflow and assistive technology; first-release review, npm Trusted Publisher setup and separate docs hosting decision.

Do not call this production ready or start punji-web migration until these release-critical gaps are resolved. No live deployment, consumer changes or npm publication was performed.
