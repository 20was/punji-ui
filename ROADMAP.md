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
| Quality | Playwright visual regression in Docker (baseline and fixture counts in [docs/VISUAL-TESTING.md](docs/VISUAL-TESTING.md); interaction and axe specs), unit and property tests, size budgets, package checks, clean-consumer install check |
| Docs | Self-contained site with a finance-first sidebar (page count: `npm run site:build`); props generated from declarations |

## Done (merged in #25)

| Area | What exists |
| --- | --- |
| Discoverability | SEO-ready docs site: clean URLs, prerendered HTML per page, unique titles and descriptions, canonical, Open Graph, JSON-LD, sitemap, robots.txt, llms.txt, favicon and social image, `check:seo` gate; finance-first README and package metadata |
| Financial charts | CandlestickChart (volume pane, moving averages), PerformanceChart (vs benchmarks), DepthChart, shared chart maths with downsampling |
| Banking and payments | AccountNumber, BankAccountCard, TransactionList, PaymentReceipt, PaymentTimeline, BeneficiarySelector |
| Portfolio | HoldingsTable, allocation donut with legend, dividend and transaction history, portfolio overview |
| Showcase | 13 copyable patterns at `/showcase/<slug>/` built only from `@punji/ui` exports; 32 portal paths redirect to them or to the nearest component page ([site/README.md](site/README.md)) |
| Guides and docs pages | "Get started" section (introduction, installation, Next.js, Vite, theming, SSR, Tailwind, live data, security, roadmap, contributing) and pages for the planned generic components |
| Container fit | Components size to their container rather than the viewport (`PortfolioAllocation`, `ShareBar`, `StatGrid`, `FinancialSummary`, `TrialBalance`, `JournalEntryView`, `LedgerTable`), covered by the `container-fit` visual fixture |

## Next, in order

Each wave is independently mergeable; every item ships with tests, docs pages,
visual baselines and size budgets.

### Wave 2: remaining compositions and forms

- **Forms (done):** `NumberField` steppers (`step`, `min`, `max`, `steppers`; no separate NumberInput), `PercentageInput`, `OtpInput`, `DateRangePicker` presets with the pure `date-range-presets` helpers (Nepal Shrawan fiscal year), `StatementUpload`.
- **Docs pages still missing:** Calendar, Chip, FilterChip, ShowMore, InlineConfirm, Avatar, StatusTag, StatGrid and StatTile, Sheet and Dock, DrawerScreen, and the cutover items in [site/README.md](site/README.md).
- **Gaps the showcase exposed (check each against the current code before starting):** `PageHeader` always renders an `h1` (no heading level); `Button` has no stacked icon-over-label (tile) variant; `Tile` shows only four characters of a five-letter symbol.

### Wave 3: scale and trust

- Virtualised data table for 10k+ rows; column pinning, resizing and multi-sort; export controls. Done: `VirtualFinancialTable` and `TableExport`, no new dependency ([docs/TABLES.md](docs/TABLES.md)).
- High-contrast theme, density setting, RTL verification. Done: `light-hc` and `dark-hc` (AAA, gated), forced colours, `data-pu-density`, `createTheme` brand theming, logical properties and RTL fixtures ([docs/THEMING.md](docs/THEMING.md)). Open: visual baselines for the `rtl` and `theme-modes` fixtures, a manual Windows High Contrast pass.
- Performance profiling of live-updating tables and charts with published numbers. Done: tables (`npm run bench:table`) and live charts and `Live` tweening (`npm run bench:charts`), in [docs/PERFORMANCE.md](docs/PERFORMANCE.md), with a count-based regression test in CI.
- Automated Next.js App Router consumer build. Done: `npm run check:nextjs`, its own CI job.
- Manual VoiceOver/NVDA pass.

### Wave 4: adoption

- Full example apps: trading dashboard, portfolio tracker, invoicing.
- Done: StackBlitz starters (`templates/vite-react`, `templates/nextjs-app-router`, built in CI by `check:templates`), a copy-in shadcn registry of the Showcase patterns (`/r/<name>.json`), Markdown for every docs page (`index.md`, linked from llms.txt), a component contribution template (`docs/CONTRIBUTING-COMPONENT.md`, `npm run new:component`) and component-request and good-first-issue forms.

### After the first release

- punji-web adopts the published package per [docs/INTEGRATION.md](docs/INTEGRATION.md); no punji-web changes until then.
- Cut the docs over to design.punji.app (the only docs domain), replacing the punji-web portal with existing URLs preserved; app-specific component pages map to showcase patterns or redirects.

## Calendar notes

Calendar, DatePicker and DateRangePicker support Gregorian/BS display, Nepali and
English labels and digits, strict input, bounds and keyboard navigation
([API and limits](docs/CALENDAR.md)). Still open: native Nepali copy review,
multi-month ranges, time selection and RTL verification.
