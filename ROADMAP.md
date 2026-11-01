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
- High-contrast theme, density setting, RTL verification. Done: `light-hc` and `dark-hc` (AAA, gated), forced colours, `data-pu-density`, `createTheme` brand theming, logical properties and RTL fixtures ([docs/THEMING.md](docs/THEMING.md)). Baselines for the `rtl` and `theme-modes` fixtures are recorded. Open: a manual Windows High Contrast pass.
- Performance profiling of live-updating tables and charts with published numbers. Done: tables (`npm run bench:table`) and live charts and `Live` tweening (`npm run bench:charts`), in [docs/PERFORMANCE.md](docs/PERFORMANCE.md), with a count-based regression test in CI.
- Automated Next.js App Router consumer build. Done: `npm run check:nextjs`, its own CI job.
- Manual VoiceOver/NVDA pass.

### Wave 4: adoption

- Done: eight full apps under `/apps/` built only from package exports, each with simulated live data and flows covered by `check:site`: trading terminal, wealth dashboard, accounting, billing and payroll, retail banking, digital wallet, market portal, invest and insure.
- Done: StackBlitz starters (`templates/vite-react`, `templates/nextjs-app-router`, built in CI by `check:templates`), a copy-in shadcn registry of the Showcase patterns (`/r/<name>.json`), Markdown for every docs page (`index.md`, linked from llms.txt), a component contribution template (`docs/CONTRIBUTING-COMPONENT.md`, `npm run new:component`) and component-request and good-first-issue forms.

### Domains, trust and global (done, unreleased: ships in 0.2.0)

- Nepal finance domains: trading (`nepse-fees`, `OrderTicket`, `OrderList`), share issues (`share-issues`, `ApplyIssueForm`, `AllotmentChecker`), wallets and QR (`emvco-qr`, `QrCode`, `PinPad`), lending and KYC (`lending`, `kyc`, `nepal-address-data`), tax and payroll (`tax`, `TaxInvoice`, `Payslip`), investments (`invest`: exact `xirr`, SIP), `ReconciliationMatcher`, `MarketBreadth`, `RiskMeter`.
- Trust and safety kit (`TransferReview`, `PayeeVerification`, `HoldToConfirm`, `ScamWarning`, `SecureField`, `detectSpoofing`), global money (lakh grouping for any locale, ISO 4217, 18 digit scripts), payment fields (IBAN, cards, SWIFT, IFSC/UPI, UK, US ABA, Nepal) and a locale layer with machine-drafted `ne`, `hi`, `bn` packs.
- AI-ready docs: `/components.json`, per-page Markdown, llms.txt.

### Next

- Native review of the Nepali, Hindi and Bengali packs, local-level spellings, and the example rates (NEPSE fees, circuit tiers, tax slabs) against official sources.
- Manual VoiceOver/NVDA and Windows High Contrast passes.
- punji-web adopts the published package per [docs/INTEGRATION.md](docs/INTEGRATION.md); no punji-web changes until then.
- Docs are live on design.punji.app (Cloudflare static assets, `wrangler.jsonc`); automatic deploys start once `CLOUDFLARE_API_TOKEN` and `DOCS_DEPLOY_ENABLED` are set.

## Calendar notes

Calendar, DatePicker and DateRangePicker support Gregorian/BS display, Nepali and
English labels and digits, strict input, bounds and keyboard navigation
([API and limits](docs/CALENDAR.md)). Still open: native Nepali copy review,
multi-month ranges, time selection and RTL verification.
