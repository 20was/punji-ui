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

### Wave 2: compositions and guides

- **Portfolio:** HoldingsTable, allocation donut with legend, dividend and transaction history, portfolio overview.
- **Guides:** getting started with Next.js App Router and Vite, theming and custom tokens, SSR/RSC, Tailwind interop, live data adapters.
- **Remaining docs pages:** forms, layout and feedback exports still listed as planned in the site sidebar.
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
- Cut the docs over to design.punji.app (the only docs domain), replacing the punji-web portal with existing URLs preserved; app-specific pages are the cutover gap to resolve first.

## Calendar notes

Calendar, DatePicker and DateRangePicker support Gregorian/BS display, Nepali and
English labels and digits, strict input, bounds and keyboard navigation
([API and limits](docs/CALENDAR.md)). Still open: native Nepali copy review,
multi-month ranges, time selection and RTL verification.
