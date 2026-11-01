<a href="https://design.punji.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/punji-ui-banner-dark.svg">
    <img alt="Punji UI: calm, accessible React components. Themed with CSS variables, light and dark, first-class Devanagari." src=".github/assets/punji-ui-banner-light.svg" width="100%">
  </picture>
</a>

> [!NOTE]
> `@punji/ui` 0.1.0 is on npm, published from CI with provenance. It is pre-1.0: a minor version can change APIs and styles, so pin an exact version and read the [changelog](./CHANGELOG.md) before you upgrade.

<p align="center">
  <a href="https://github.com/20was/punji-ui/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/20was/punji-ui/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/20was/punji-ui"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/20was/punji-ui/badge"></a>
  <a href="https://www.npmjs.com/package/@punji/ui"><img alt="npm version" src="https://img.shields.io/npm/v/@punji/ui"></a>
  <a href="./LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-blue"></a>
</p>

<p align="center">
  <a href="https://design.punji.app">Documentation</a> ·
  <a href="./ROADMAP.md">Roadmap</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a> ·
  <a href="./SECURITY.md">Security</a>
</p>

# Punji UI

**A finance-first React design system: exact money, stock-market tables, ledgers and a Nepal-first locale layer, usable in any currency.**

Built for the screens where a wrong digit costs someone money:

- stock market and trading apps (quote boards, movers, watchlists, heatmaps, order book depth)
- portfolio and wealth trackers (positions, cost basis, P&L, allocation)
- accounting and bookkeeping tools (ledgers, journals, trial balance, statements, invoices)
- banking and fintech dashboards (money display and input, statements, status, export)

## Quick start

```sh
npm install @punji/ui   # React 19 and React DOM 19 are peer dependencies
```

Import the CSS once at your app's root, then use the components. Prices are `bigint` minor units (paisa, cents), so `51230n` is Rs 512.30:

```tsx
import '@punji/ui/styles.css';
import { MoneyDisplay, PriceChange, StockTable, type Quote } from '@punji/ui';

const quotes: Quote[] = [
  { symbol: 'NABIL', ltp: 51230n, previousClose: 50500n, volume: 12400, turnover: 63_525_200n },
  { symbol: 'NTC', ltp: 84000n, previousClose: 85000n, volume: 3100, turnover: 26_040_000n },
];

export function Board() {
  return (
    <>
      <p>
        Portfolio value <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />{' '}
        <PriceChange current={51230n} previous={50500n} currency="NPR" />
      </p>
      <StockTable caption="NEPSE quotes · NPR" quotes={quotes} />
    </>
  );
}
```

That renders `NPR 12,34,567.89`, a signed change with an arrow and a spoken label (not colour alone), and a sortable, accessible quote table. The data above is invented. For another currency, change `currency` and `locale` (for example `"USD"` and `"en-US"`).

## What's inside

Every module has its own subpath (`@punji/ui/<name>`) and stylesheet (`@punji/ui/css/<name>.css`); everything is also exported from the root. The full subpath list is the `exports` map in [package.json](package.json); the original component inventory is [at the end of this file](#all-modules).

| Domain | Key exports | Subpaths | Guide |
| --- | --- | --- | --- |
| Money and Nepal | `formatMoney`, `parseMoney`, `MoneyDisplay`, `PriceChange`, `CurrencyInput`, `formatNPR`, `gregorianToBS`, `nepalFiscalYear`, `parseMinorUnits`, `AppShell`, `FinancialTable`, `PriceChart`, `OrderBook` | `/money`, `/money-display`, `/price-change`, `/currency-input`, `/nepal`, `/nepal/format`, `/nepal/calendar`, `/nepal/money`, `/financial`, `/order-book` | [FINANCIAL.md](docs/FINANCIAL.md) |
| Calculations | `computePosition` (FIFO or weighted average), `valuePosition`, `breakEvenPrice`, `taxOnGain`, `allocation`, `percentageChange`, `cagr`, `divideRounded` | `/calculations` | [FINANCIAL.md](docs/FINANCIAL.md#financial-calculations) |
| Market | `StockTable`, `MarketMovers`, `MarketIndices`, `MarketStatus`, `getMarketSession`, `PriceLimitIndicator`, `Watchlist`, `MarketHeatmap`, `MarketBreadth`, `sortQuotes` | `/stock-table`, `/market-movers`, `/market-indices`, `/market-status`, `/price-limit`, `/watchlist`, `/market-heatmap`, `/market-breadth`, `/nepal/market-format` | [MARKET.md](docs/MARKET.md) |
| Accounting | `LedgerTable`, `JournalEntryView`, `TrialBalance`, `StatementTable`, `DebitCredit`, `PaymentStatus`, `FinancialPeriodSelector`, `isBalanced`, `trialBalance`, `runningBalance`, `ledgerToCsv` | `/ledger`, `/ledger-table`, `/debit-credit`, `/journal-entry`, `/trial-balance`, `/statement-table`, `/payment-status`, `/period-selector` | [ACCOUNTING.md](docs/ACCOUNTING.md) |
| Banking & payments | `AccountNumber`, `BankAccountCard`, `TransactionList`, `TransactionStatus`, `PaymentReceipt`, `PaymentTimeline`, `BeneficiarySelector`, `BillSummary`, `maskAccountNumber`, `isValidIban`, `transactionsToCsv` | `/banking`, `/account-number`, `/bank-account-card`, `/transaction-list`, `/transaction-status`, `/payment-receipt`, `/payment-timeline`, `/beneficiary-selector`, `/bill-summary` | [BANKING.md](docs/BANKING.md) |
| Lending, deposits, KYC & remittance | `LoanCalculator`, `AmortisationTable`, `DepositCalculator`, `InterestRateTable`, `NepalAddressPicker`, `IdNumberInput`, `DocumentUpload`, `OnboardingWizard`, `RemittanceTracker`, `InsurancePremiumCard`, `calculateEmi`, `amortise`, `simulateDeposit`, `validatePan` | `/lending`, `/kyc`, `/nepal-address-data`, `/loan-calculator`, `/amortisation-table`, `/deposit-calculator`, `/interest-rate-table`, `/nepal-address-picker`, `/id-number-input`, `/document-upload`, `/onboarding-wizard`, `/remittance-tracker`, `/insurance-premium-card` | [LENDING.md](docs/LENDING.md) |
| Trust & safety | `TransferReview`, `ConfirmAmount`, `PayeeVerification`, `HoldToConfirm`, `SessionTimeoutWarning`, `ScamWarning`, `SecureField`, `detectSpoofing` | `/trust`, `/transfer-review`, `/payee-verification`, `/hold-to-confirm`, `/session-timeout`, `/scam-warning`, `/secure-field` | [TRUST.md](docs/TRUST.md) |
| Global money | `createMoneyFormatter` (`grouping`, `exponent`), `toAsciiDigits`, `toScriptDigits`, `currencyAmountInWords`, `getIso4217` | `/money`, `/money/iso4217`, `/nepal/decimal` | [GLOBAL-MONEY.md](docs/GLOBAL-MONEY.md) |
| Hooks | `useDebounce`, `useThrottle`, `useControllableState`, `usePrevious`, `useToggle`, `useClipboard`, `useLocalStorage`, `useSessionStorage`, `useClickOutside`, `usePagination`, `useTableSelection`, `useColumnVisibility`, `useMediaQuery`, `useHydrated`, `useStableOrder` | `/hooks`, or one per hook such as `/use-debounce` | [HOOKS.md](docs/HOOKS.md) |
| Large tables | `VirtualFinancialTable` (10k+ rows, pinned and resizable columns, multi-sort), `compareByRules`, `TableExport` (visible, all or selected rows to CSV) | `/virtual-table`, `/table-export` | [TABLES.md](docs/TABLES.md#large-tables-virtualfinancialtable), [PERFORMANCE.md](docs/PERFORMANCE.md) |
| Export | `toCsv` (formula-injection neutralised, optional Excel BOM), `downloadText` | `/export`, `/download` | [EXPORT.md](docs/EXPORT.md) |
| General UI | `Button`, `Card`, `DataTable`, `Tabs`, `Select`, `Drawer`, `Sheet`, `CommandPalette`, `Calendar`, `DatePicker`, `DateRangePicker`, `Sparkline`, `ColumnChart`, `SplitBar`, fields, states and layout | see [all modules](#all-modules) | [TABLES.md](docs/TABLES.md), [CALENDAR.md](docs/CALENDAR.md), [SELECT.md](docs/SELECT.md), [COMPONENTS.md](docs/COMPONENTS.md) |

Nothing here fetches data. You pass quotes, rows and amounts in as props; for live feeds, pass new props from your own socket or query. Accounting components are display and arithmetic helpers, not an accounting system: your server must validate every amount again ([ACCOUNTING.md](docs/ACCOUNTING.md)).

## Why Punji UI

- **Exact money.** Amounts are `bigint` minor units, never floats. Rounding is always an explicit mode you pass (`half-even`, `half-up`, and others), and the calculation layer is property-tested (cost is conserved, allocation shares sum to exactly 100).
- **Nepal-first, currency-generic.** NPR with lakh/crore grouping, Devanagari digits and Nepali labels, the Bikram Sambat calendar and fiscal years, and NEPSE-style market sessions and price limits. All of it is a preset: USD, EUR, JPY, KWD and any other ISO currency work through configuration, with the exponent taken from `Intl`.
- **Accessible.** Native semantics and WAI-ARIA patterns, keyboard-only use, visible focus, reduced motion, and a change is never shown by colour alone. axe-core runs on every visual fixture in light and dark ([details](#accessibility)).
- **One runtime dependency.** Besides the React peer, the only production dependency is one pinned, MIT-licensed Bikram Sambat converter, imported by `nepal/calendar` alone. CI fails on any other. See [DEPENDENCY-AUDIT.md](DEPENDENCY-AUDIT.md).
- **Small and tree-shakeable.** ES modules with per-component subpaths and `sideEffects` limited to CSS. Measured gzip sizes: `Button` 0.7 kB, money formatter 3.4 kB, `MoneyDisplay` 3.8 kB, `PriceChange` 4.3 kB, `StockTable` 9.9 kB, `ledger` helpers 2.4 kB, `calculations` 1.9 kB, all CSS 22.6 kB. Importing everything from the root is 62 kB; budgets are enforced by `npm run size`.
- **SSR and RSC friendly.** Components that use state or events carry `'use client'`; the pure modules (`money`, `calculations`, `export`, `ledger`, `nepal/*`) have no React or browser globals, enforced in lint. The release check server-renders the packed tarball.
- **Tested visually.** Screenshots of every fixture in light and dark at phone and desktop widths are compared in the same Playwright Docker image CI uses ([VISUAL-TESTING.md](docs/VISUAL-TESTING.md)).

## Works with

React 19 or later, as ESM with bundled declarations. The release check installs the packed tarball into a fresh project, type-checks it with strict TypeScript, renders it on the server and builds it with Vite. Client modules keep their `'use client'` directive, so they work in the Next.js App Router without a wrapper: CI builds a fresh Next.js app against the packed tarball (`npm run check:nextjs`), with server components calling the pure modules, and checks that the built pages hydrate cleanly. Browsers: Chrome and Edge 111+, Firefox 113+, Safari and iOS Safari 16.4+ (CSS cascade layers and `color-mix()`).

## Theming in 5 lines

Everything is a CSS variable in a cascade layer (`punji.tokens`, `punji.components`), so your unlayered CSS always wins. Light and dark follow `prefers-color-scheme`; force one with `data-theme="light"` or `"dark"` on `<html>` or any element.

```css
:root {
  --pu-color-accent: #4f46e5;
  --pu-color-accent-fill: #4f46e5;
  --pu-radius-control: 6px;
}
```

Every token with its light and dark value: [docs/tokens.md](./docs/tokens.md). For the smallest CSS, import `@punji/ui/tokens.css`, `@punji/ui/css/base.css` and only the `@punji/ui/css/<name>.css` files you use.

Type is set for Latin and Devanagari together (Geist and Mukta, SIL Open Font License, not bundled), so English and Nepali interfaces share one scale.

### Links and routers

The package has no router dependency. A component that takes `href` renders a plain `<a>`; pass your router's link once wrapped:

```tsx
import { Link } from 'react-router-dom';
import { Button, type LinkComponent } from '@punji/ui';

const RouterLink: LinkComponent = ({ href, ...rest }) => <Link to={href} {...rest} />;

<Button href="/settings" linkComponent={RouterLink}>Settings</Button>;
```

## Accessibility

Every component follows its [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) pattern, works with the keyboard alone, draws one visible focus ring, respects `prefers-reduced-motion`, and passes axe-core with no serious or critical issue in the test suite. Colour contrast is checked by axe-core in a real browser for every visual fixture in light and dark themes. If something does not work with your assistive technology, please [open an issue](https://github.com/20was/punji-ui/issues/new/choose).

## Run it locally

```sh
npm ci --ignore-scripts
npm run build
npm run examples     # portfolio, invoice and watchlist demos, importing the built package
npm run site:dev     # the documentation site
```

Architecture and release boundaries: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Remaining gaps: [audit](docs/audit/README.md) and [ROADMAP.md](./ROADMAP.md). Research and upstream credits: [docs/RESEARCH.md](docs/RESEARCH.md).

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md): how to run the checks, the bar a new component has to meet, and how releases work. Everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md). Report vulnerabilities privately, as described in [SECURITY.md](./SECURITY.md).

## Licence

The code is [MIT](./LICENSE). The fonts it is designed for (Geist, Mukta) are under the SIL Open Font License and are not bundled. The Punji name and logo are trademarks and are not covered by the MIT licence: see [TRADEMARKS.md](./TRADEMARKS.md).

## All modules

Each module is its own subpath, and its documentation is on [design.punji.app](https://design.punji.app).

<!-- components:start -->
<!-- Public component inventory; maintained in this repository. -->

| Exports | Subpath | Docs |
| --- | --- | --- |
| `Avatar` | `@punji/ui/avatar` | [Avatar](https://design.punji.app/components/avatar) |
| `Button` | `@punji/ui/button` | [Button](https://design.punji.app/components/button) |
| `Card` | `@punji/ui/card` | [Card](https://design.punji.app/components/card) |
| `Checkbox` | `@punji/ui/checkbox` | [Checkbox](https://design.punji.app/components/checkbox) |
| `ChoiceGroup` | `@punji/ui/choice-group` | [Choice group](https://design.punji.app/components/choice-group) |
| `CommandPalette` | `@punji/ui/command-palette` | [Command palette](https://design.punji.app/components/command-palette) |
| `CompanySearch` | `@punji/ui/company-search` | [Company search](https://design.punji.app/components/company-search) |
| `Chip`, `ChipRow`, `SegmentedControl`, `SegmentedSwitch` | `@punji/ui/controls` | [Segmented control](https://design.punji.app/components/segmented-control) · [Chip](https://design.punji.app/components/chip) |
| `Drawer` | `@punji/ui/drawer` | [Drawer](https://design.punji.app/components/drawer) |
| `DrawerScreen`, `DrawerHeader`, `DrawerBody`, `DrawerFooter` | `@punji/ui/drawer-screen` | [Drawer screen](https://design.punji.app/components/drawer-screen) |
| `Field`, `NumberField`, `TextAreaField`, `DateField`, `SelectField`, `SymbolField`, `PriceField` | `@punji/ui/fields` | [Field](https://design.punji.app/components/field) |
| `Figure`, `Delta` | `@punji/ui/figures` | [Figure and Delta](https://design.punji.app/components/figure) |
| `FilterChip` | `@punji/ui/filter-chip` | [Filter chip](https://design.punji.app/components/filter-chip) |
| `FloatingTooltip`, `IconHint` | `@punji/ui/floating-tooltip` | [Tooltip and InfoTip](https://design.punji.app/components/tooltip) |
| `InfoTip`, `Tooltip` | `@punji/ui/info-tip` | [Tooltip and InfoTip](https://design.punji.app/components/tooltip) |
| `InlineConfirm` | `@punji/ui/inline-confirm` | [Inline confirm](https://design.punji.app/components/inline-confirm) |
| `PageLayout`, `PageHeader`, `ListSectionHeader`, `ChevronLeft`, `ChevronRight` | `@punji/ui/layout` | [Page layout and header](https://design.punji.app/components/page-layout) |
| `ListFilter` | `@punji/ui/list-filter` | [List filter](https://design.punji.app/components/list-filter) |
| `Live`, `LiveFigure` | `@punji/ui/live-figure` | [Live figure](https://design.punji.app/components/live-figure) |
| `LockedNote` | `@punji/ui/locked-note` | [Empty state and Note](https://design.punji.app/components/empty-state) |
| `Sheet`, `ToastProvider`, `Dock` | `@punji/ui/overlay` | [Toast](https://design.punji.app/components/toast) · [Sheet](https://design.punji.app/components/sheet) |
| `PopoverAnchor`, `Popover` | `@punji/ui/popover` | [Popover](https://design.punji.app/components/popover) |
| `RangeSlider` | `@punji/ui/range-slider` | [Range slider](https://design.punji.app/components/range-slider) |
| `GroupedCell`, `RowList`, `ValueRow`, `DataRows`, `DataRow`, `Tile` | `@punji/ui/rows` | [Rows and lists](https://design.punji.app/components/rows) |
| `ChevronDown`, `Select` | `@punji/ui/select` | [Select](https://design.punji.app/components/select) |
| `ShowMore` | `@punji/ui/show-more` | [Show more](https://design.punji.app/components/show-more) |
| `EmptyState`, `ToneIcon`, `Note`, `Skeleton`, `SkeletonText` | `@punji/ui/states` | [Empty state and Note](https://design.punji.app/components/empty-state) · [Skeleton](https://design.punji.app/components/skeleton) |
| `StatGrid`, `StatTile` | `@punji/ui/stats` | [Stat tile](https://design.punji.app/components/stat-tile) |
| `StatusPill`, `CountBadge` | `@punji/ui/status-pill` | [Status pill](https://design.punji.app/components/status-pill) |
| `StatusTag` | `@punji/ui/status-tag` | [Status tag](https://design.punji.app/components/status-tag) |
| `Switch` | `@punji/ui/switch` | [Switch](https://design.punji.app/components/switch) |
| `DataTable`, `DataListRow`, `Cell` | `@punji/ui/table` | [Data table](https://design.punji.app/components/data-table) |
| `Tabs`, `PanelTabs` | `@punji/ui/tabs` | [Tabs](https://design.punji.app/components/tabs) · [Panel tabs](https://design.punji.app/components/panel-tabs) |
| `bracketScale`, `valueScale` | `@punji/ui/chart-scale` | [Trend chart](https://design.punji.app/components/trend-chart) |
| `comboClosed`, `comboStep` | `@punji/ui/combo-step` | [Company search](https://design.punji.app/components/company-search) |
| `moveIndex`, `moveChip` | `@punji/ui/command-keys` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |
| `compactRs` | `@punji/ui/compact` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |
| `isNum`, `formatFigure`, `shortCompanyName`, `toneOf`, `parseNumber`, `searchSymbols`, `segmentTarget` | `@punji/ui/format` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |
| `TWEEN_MS`, `TINT_MS` | `@punji/ui/live` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |

<!-- components:end -->

Newer modules (market, accounting, money, hooks, charts and the other status and list components) are listed under [What's inside](#whats-inside) and in the `exports` map of `package.json`; the table above is the original general-purpose inventory.

Financial additions: `AppShell`, `FinancialSummary`, `FinancialTable`, `PriceChart`, `OrderBook` (`@punji/ui/financial`) and `OrderBookDepth` (`@punji/ui/order-book`).
