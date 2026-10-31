# Portfolio and investment compositions

Five components and a set of pure helpers for a portfolio page. They are compositions of existing parts (`DataTable`, `ShareDonut`, `ShareBar`, `ShareLegend`, `SummaryFigure`, `MetricTile`, `ColumnChart`, `MoneyDisplay`, `PriceChange`, `Chip`, `Select`, `DateRangePicker`) and the calculations module. They fetch nothing, own no state about your data and compute nothing a pure helper does not. Import from the root or the subpaths below; `@punji/ui/styles.css` already includes `portfolio.css`.

| Component | Subpath | Built on |
|---|---|---|
| `HoldingsTable` | `@punji/ui/holdings-table` | `DataTable` (with its new `footer`), `MoneyDisplay`, `PriceChange` |
| `PortfolioAllocation` | `@punji/ui/portfolio-allocation` | `ShareDonut`, `ShareBar`, `ShareLegend` |
| `PortfolioOverview` | `@punji/ui/portfolio-overview` | `SummaryFigure`, `MetricRow`, `MetricTile` |
| `DividendHistory` | `@punji/ui/dividend-history` | `ColumnChart`, `DataTable` |
| `TransactionHistory` | `@punji/ui/transaction-history` | `DataTable` (paging), `Chip`, `Select`, `DateRangePicker` |
| pure helpers | `@punji/ui/portfolio` | `computePosition`, `valuePosition`, `allocation`, `returnOnCost`, `percentageChange`, `toCsv` |

Live examples are on the docs site under "Portfolio & investment". The sample portfolio is `fixtures/portfolio-data.ts` (synthetic NEPSE-style trades, dividends and quotes), shared by the site, the visual fixtures and the tests.

## The flow

```ts
import {
  holdingsSummary, positionsFromTransactions, sortHoldings, allocateHoldings,
  transactionLedger, dividendEntriesFromTransactions, dividendsByFiscalYear,
} from '@punji/ui/portfolio';

// Your history (bigint paisa, ISO dates) and today's quotes.
const positions = positionsFromTransactions(transactions);
const { holdings, totals } = holdingsSummary(positions, quotes);   // exact, null for missing quotes

<PortfolioOverview totals={totals} />
<HoldingsTable caption="Holdings, NPR" holdings={sortHoldings(holdings, sort)} totals={totals} sort={sort} onSortChange={setSort} />
<PortfolioAllocation holdings={holdings} by="sector" label="Allocation by sector" />
<DividendHistory entries={dividendEntriesFromTransactions(transactions)} caption="Dividends" marketValue={totals.marketValue} costBasis={totals.costBasis} />
<TransactionHistory transactions={transactions} caption="Transactions" />
```

If your positions come from somewhere else, pass `PortfolioPosition[]` (`symbol`, optional `name` and `sector`, and `trades` for `computePosition`) straight to `holdingsSummary`. A bonus issue is a buy at price `0n`.

## Numeric contract

- Money is `bigint` minor units (paisa) end to end. Quantities are `bigint`. Nothing is converted to floating point except the display percentages (unrealised, day change, weight, yield), which come from `percentageChange`, `returnOnCost` and `dividendYield`-style ratios in the calculations module.
- A missing price is `null`, never zero. A holding without an LTP keeps its cost but has `marketValue`, `unrealisedPnL`, `dayChange` and `weight` of `null`, and prints a dash with a spoken "No value".
- Totals cover the priced holdings and say so: `totals.unpriced` (no LTP) and `totals.noPreviousClose` list the symbols left out, `totals.complete` is `false`, and the components print a note naming them. With open holdings and no price at all, `totals.marketValue` is `null`; with no open holdings it is a real `0n`.
- Fully sold symbols are not rows (`includeClosed: true` keeps them) but their realised P&L and fees stay in the totals.
- `holdingsSummary` throws `RangeError` on a duplicate symbol, an invalid trade or a sale larger than the units held, rather than show a wrong number. Validate user input before it reaches the ledger.
- Cost method is `average` (default) or `fifo`, with a `rounding` mode (default `half-even`), the same options as `computePosition`.

## `holdingsSummary(positions, quotes, options?)`

Returns `{ holdings: Holding[], totals: HoldingsTotals }`. Each `Holding` has `quantity`, `costBasis`, `averageCost`, `ltp`, `previousClose`, `marketValue`, `unrealisedPnL`, `unrealisedPercent` (null without positive cost, for example a bonus-only holding), `dayChange` (quantity times the price move since the previous close; an approximation for units bought today), `dayChangePercent`, `realisedPnL`, `weight` and `displayWeight`. Weights are shares of the priced value, rounded by largest remainder so the displayed weights add up to exactly 100 at `weightDecimals` (default 2). `quotes` is an array or a `Map` keyed by symbol; a market `Quote` fits.

`sortHoldings(holdings, { key, dir })` is stable, puts nulls last in both directions, compares text by upper-cased code units and never mutates. `nextHoldingSort(current, key)` is the click rule (symbol and sector start ascending, figures descending, a repeat flips). `holdingsToCsv(holdings, { totals, scale, bom })` writes RFC 4180 CSV with exact decimals, empty cells for missing values and the formula-injection protection of `toCsv`.

## HoldingsTable

Columns (`columns`, in order; `symbol` always first): `value`, `quantity`, `cost` (average), `ltp`, `pnl` (amount and percent), `day`, `weight`, and opt-in `sector`. Feed `columns` from `useColumnVisibility().visible`. Sorting is controlled: the table never reorders. `totals` adds a totals row in the table's `<tfoot>` and a note when it is incomplete. `exportFilename` adds a CSV button. `state` is `ready`, `loading` or `error` (with `onRetry`); `emptyLabel`, `density`, `bare`, `maxHeight`, `stack`, `renderSymbol`, `labels`, `columnLabels`, `money` and `convention` as on `StockTable`. Under 640px rows stack into blocks (market value beside the symbol, the rest labelled below).

`DataTable` gained one optional prop for this: `footer`, a `DataListRow` rendered in a `<tfoot>` when there are rows to total.

## PortfolioAllocation

`allocateHoldings(holdings, { by, maxSlices, decimals, otherLabel, unclassifiedLabel })` groups by `holding` (default) or `sector`, orders by value then label, and gathers everything past `maxSlices - 1` into one "Other" slice (`maxSlices` counts Other; minimum 2, default 6). Holdings without a sector go to "Unclassified"; holdings with no market value are left out and listed in `unpriced`; zero-value holdings draw no slice. Shares use `allocation()`, so they sum to exactly 100 at `decimals` (default 1) and a bigint total stays exact beyond 2^53. The component draws a `donut` (default) or `bar` with a legend, and an exact-values table (`tableView`: `hidden` by default for screen readers, `visible`, or `none`). When the hidden table is present the legend is hidden from assistive technology so nothing is read twice.

## PortfolioOverview

The lead figure is the market value of the priced holdings with the day's change beside it (`asOf` prints before it); then four tiles: invested (cost of open holdings, fees included), unrealised P&L, realised P&L, return on cost (`returnOnCost` of the unrealised P&L over the priced cost, not annualised). `state` is `ready`, `loading` (labels stay, placeholders in place of figures, `aria-busy`) or `error`.

## DividendHistory

`dividendsByFiscalYear(entries, { marketValue, costBasis, fiscalLabel })` groups `DividendEntry` records (`id`, ISO `date`, `symbol`, `kind`: `cash`, `bonus` or `rights`, and an `amount` in minor units) by Nepal fiscal year. The Gregorian date converts to Bikram Sambat and the year starts on 1 Shrawan, so 16 July 2025 (32 Ashadh 2082) is in 2081/82 and 17 July 2025 (1 Shrawan 2082) is in 2082/83. Years appear oldest first and only when they have a record. Cash yield is cash only over the one base you pass (`yieldOnValue`, `yieldOnCost`), so read it as a yield on today's value, not a historical yield; it is `null` without a positive base. Bonus shares and rights are your valuation. `dividendEntriesFromTransactions(transactions, { bonusUnitValue })` builds the entries from the same history: a dividend is its cash, a bonus issue is quantity times `bonusUnitValue` (default Rs 100 par), a rights issue is the amount subscribed.

The chart is hidden from assistive technology (it shows rounded numbers); the table carries every exact figure. Yield columns appear when `marketValue` or `costBasis` is given.

## TransactionHistory

`transactionLedger(transactions, { method, rounding })` validates the history (unique ids, strict ISO dates, positive quantities, non-negative fees and prices, a dividend `amount`), sorts it by date (equal dates keep input order) and returns `TransactionRow`s with `value`, a signed `cashFlow` and, for each sale, `realisedPnL`: the change in the symbol's realised P&L that the sale causes under `computePosition`. It is computed over the whole history, then `filterTransactions(rows, { types, symbol, range })` filters (inclusive ISO dates; a range without an end is ignored), so a filter never changes a sale's result.

Cash flow: a buy and a rights issue are minus (value + fees), a sale is plus (value - fees), a dividend is plus its cash, a bonus issue is free. The component shows the newest first (`order`), `pageSize` rows a page, filter chips for the types (several at once), a symbol select and a `DateRangePicker`. Filters are uncontrolled by default; pass `filters` and `onFiltersChange` to control them. The totals row sums the cash flow and realised P&L of everything the filters match, not just the page. `formatDate` prints dates (default Gregorian; pass a function through `gregorianToBS` for Bikram Sambat). Rows are keyed by transaction id.

## Accessibility

Real tables with captions, scoped headers and `aria-sort`; the totals in a `<tfoot>`. Gains and losses carry a sign, an arrow and a spoken word, never colour alone. The allocation chart has a legend row and a table for every slice. Loading and error states are announced. axe runs on every component in the jsdom tests and on every visual fixture in both themes at 390 and 1440.

## Not covered

No fee schedule, tax or capital-gains rule (use `taxOnGain` with your own rule), no short positions, no money-weighted or time-weighted return, no currency conversion, no fetching or live updates (pass new props), no charting of portfolio value over time.
