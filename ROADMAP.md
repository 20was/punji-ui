# Roadmap

Punji UI is a finance-first React design system: Nepal-first (NPR, lakh/crore,
Devanagari, Bikram Sambat, NEPSE) and usable for any currency or market.
Status with severities: [AUDIT.md](AUDIT.md). Standards: [QUALITY.md](QUALITY.md).
Structure and decisions: [ARCHITECTURE.md](ARCHITECTURE.md). Release procedure:
[RELEASE.md](RELEASE.md).

Out of scope for this package: brand artwork, application routes, authentication,
permissions, backend clients, tax rules and trading execution.

## Done (merged in #24)

| Area | What exists |
| --- | --- |
| Financial utilities | Exact calculations (positions, P&L, break-even, ratios, allocation), generic money formatting/parsing, ledger maths, CSV export with formula neutralisation, hooks |
| Components | Money primitives, stock market (StockTable, movers, indices, status, price limits, watchlist, heatmap, order books), accounting (ledger, journal, trial balance, statements, payment status, period selector), 17 modules migrated from punji-web |
| Quality | Playwright visual regression in Docker (640 baselines, interaction and axe specs), unit and property tests, size budgets, package checks, clean-consumer install check |
| Docs | Self-contained site with 49 pages and a finance-first sidebar; props generated from declarations |

## Next, in order

Each wave is independently mergeable; every item ships with tests, docs pages,
visual baselines and size budgets.

### Wave 1: discoverability and the biggest component gaps (in progress)

- **SEO-ready docs site:** clean URLs, prerendered HTML per page, unique titles and descriptions, canonical, Open Graph, JSON-LD, sitemap, robots.txt, llms.txt, favicon and social image, `check:seo` gate.
- **README and package metadata:** finance-first positioning, a 30-second quickstart that type-checks, accurate dependency and size claims, finance keywords.
- **Financial charts:** CandlestickChart (with volume pane and moving averages), PerformanceChart (vs benchmarks), DepthChart, shared chart maths with downsampling.
- **Banking & payments:** AccountNumber (masked, explicit reveal and copy), BankAccountCard, TransactionList, PaymentReceipt, PaymentTimeline, BeneficiarySelector.

### Wave 2: compositions, showcase and guides (guides, generic pages and showcase done; portfolio and forms below still open)

- **Showcase section on design.punji.app (done):** 13 patterns at `/showcase/<slug>/` (app header, app band, portfolio tracker, live market board, watchlist and alerts, stock detail, invoice, bank statement, payment flow, accounting dashboard, dividend tracker, IPO result check, mobile account home), built only from `@punji/ui` exports plus a layout stylesheet each, live with copyable typechecked source and labelled as patterns to copy, not package API. 32 portal paths redirect to them or to the nearest component page ([site/README.md](site/README.md)). Gaps the patterns exposed: `PageHeader` always renders an `h1` (no heading level); `FinancialSummary` columns follow the viewport, not its container; `TrialBalance`, `JournalEntryView` and `LedgerTable` do not stack below about 340 px; `Button` has no stacked icon-over-label (tile) variant; `Tile` shows only four characters of a five-letter symbol.

- **Portfolio:** HoldingsTable, allocation donut with legend, dividend and transaction history, portfolio overview.
- **Guides (done):** a "Get started" section with introduction and installation, Next.js App Router, Vite, theming and custom tokens, server rendering and hydration, Tailwind interop, live data adapters, security, roadmap and contributing (URLs `/get-started/<slug>/`, code typechecked by `typecheck:site`).
- **Remaining docs pages (done for the planned lists):** pages for Field (with NumberField, PriceField, DateField, SelectField, SymbolField, TextAreaField), Select, SegmentedControl, Tabs, Checkbox, Switch, RangeSlider, ChoiceGroup, ListFilter, Popover, Drawer, CommandPalette, Toast, Tooltip and InfoTip, StatusPill, LockedNote, Figure and Delta, LiveFigure, page layout and header, AppShell, Rows (ValueRow, DataRows) and FinancialSummary, with every prop documented in source. Still without a page: Calendar, Chip, FilterChip, ShowMore, InlineConfirm, Avatar, StatusTag, StatGrid and StatTile, Sheet and Dock, DrawerScreen, and the cutover items in [site/README.md](site/README.md).
- **Forms:** NumberInput, PercentageInput, OTP input, date-range presets, statement upload.

### Wave 3: scale and trust

- Virtualised data table for 10k+ rows; column pinning, resizing and multi-sort; export controls.
- High-contrast theme, density setting, RTL verification.
- Performance profiling of live-updating tables and charts with published numbers.
- Manual VoiceOver/NVDA pass; automated Next.js App Router consumer build.

### Wave 4: adoption

- Full example apps: trading dashboard, portfolio tracker, invoicing.
- StackBlitz starters, good-first-issues, component contribution template.

### After the first release

- punji-web adopts the published package per [docs/INTEGRATION.md](docs/INTEGRATION.md); no punji-web changes until then.
- Cut the docs over to design.punji.app (the only docs domain), replacing the punji-web portal with existing URLs preserved; app-specific component pages map to showcase patterns or redirects.

## Calendar notes

Calendar, DatePicker and DateRangePicker support Gregorian/BS display, Nepali and
English labels and digits, strict input, bounds and keyboard navigation
([API and limits](docs/CALENDAR.md)). Still open: native Nepali copy review,
multi-month ranges, time selection and RTL verification.
