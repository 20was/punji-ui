# Market components

Eight display components and their pure helpers for stock quotes: `StockTable`, `MarketMovers`, `MarketIndices`,
`MarketStatus`, `PriceLimitIndicator`, `Watchlist`, `MarketHeatmap` and `MarketBreadth`. Each has a subpath (`@punji/ui/stock-table`, …)
and a stylesheet (`@punji/ui/css/<name>.css`, all in `styles.css`).

**Props only.** Nothing here fetches, polls or subscribes. Pass quotes in; for live data feed new props from your own
socket or query, optionally through the `Live` adapters (`live` on `StockTable` and `Watchlist` counts the LTP to each
new value and flashes its direction, and honours reduced motion). The examples use illustrative NEPSE-style data in NPR;
they are not real prices.

## The `Quote`

```ts
interface Quote {
  symbol: string;              // unique, stable key
  name?: string; sector?: string;
  ltp: bigint | null;          // minor units (paisa): Rs 512.30 is 51230n
  previousClose: bigint | null;
  volume: number | null;       // shares
  turnover: bigint | null;     // minor units
  history?: (number | null)[]; // closes for a trend line, oldest first
  lowerLimit?: bigint | null; upperLimit?: bigint | null; // circuit limits, minor units
}
```

Prices stay exact `bigint` minor units, the same as `MoneyDisplay` and `PriceChange`. Any field may be `null`
(not traded, not published): it shows as a dash with a spoken "No value", never as zero, and sorts last. The change is
derived from `ltp` and `previousClose` with `priceChange`; a previous close that is zero gives no percent.

Money and locale: `money` (a `MoneyFormatConfig`) defaults to `nepalQuoteMoney` (NPR, `en-IN`, lakh/crore grouping, no
currency mark: name the currency once in the caption or a heading). Pass `{ currency: 'USD', locale: 'en-US', display: 'none' }`
for an international market; compact figures then read `52M`, `9.85B`.

## StockTable

A typed composition over `DataTable` (sorting heads, `aria-sort`, selection, sticky head, the stacked phone layout). Use
it for a full quote board. For a short top-N list use `MarketMovers`; for the stocks a person follows use `Watchlist`;
for arbitrary records use `FinancialTable`.

Props: `caption`, `quotes`, `columns` (visible, in order; default symbol, LTP, change, volume, turnover; `trend` is
optional; `symbol` is always first), `labels`, `sort` + `onSortChange`, `money`, `convention` (`green-up`, `red-up`),
`changeLabels`, `selectedSymbols` + `onSelectedSymbolsChange`, `selectLabel`, `density` (`comfortable`, `compact`),
`bare`, `maxHeight` (sticky head inside a scrolling box), `stickToPage`, `stack` (default true), `live`,
`renderSymbol` (for example a link), `state` (`ready`, `loading`, `error`), `emptyLabel`, `loadingLabel`, `errorLabel`,
`retryLabel`, `onRetry`, `testId`.

The caller owns data and sort. Sort with the pure helper, keep the state, hand both back:

```tsx
const [sort, setSort] = useState<QuoteSort>({ key: 'changePercent', dir: 'desc' });
const columns = useColumnVisibility({ columns: ['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend'] });
const [selected, setSelected] = useState<readonly string[]>([]);

<StockTable
  caption="NEPSE quotes · NPR"
  quotes={sortQuotes(quotes, sort)}
  sort={sort}
  onSortChange={setSort}
  columns={columns.visible as StockColumn[]}
  selectedSymbols={selected}
  onSelectedSymbolsChange={setSelected}
  maxHeight={480}
/>
```

`sortQuotes(quotes, { key, dir })` keys: `symbol`, `ltp`, `change`, `changePercent`, `volume`, `turnover`. It returns a new
array, is stable (ties keep input order in both directions), puts `null` last in both directions, compares symbols by
upper-cased code units (not locale), and never mutates. `nextQuoteSort(current, key)` is the click rule (symbol starts
ascending, figures descending, a repeat click flips). Search and pagination are not built in: filter first, sort the
matches, then slice (see [TABLES.md](TABLES.md)).

Keyboard and a11y: native table semantics with a caption; column heads are buttons only when `onSortChange` is given;
numeric columns are right aligned with tabular digits; the change is sign, arrow and a spoken word, not colour alone;
under 640 px each row stacks into a block with labelled values.

## MarketMovers

Gainers, losers and most active as ARIA tabs over one compact `StockTable`. Props: `quotes`, `label`, `tab`/`defaultTab`/
`onTabChange`, `limit` (5), `activeBy` (`turnover`, `volume`), `tabLabels`, `emptyLabels`, `footer`, plus `money`,
`convention`, `renderSymbol`, `live`, `state` and the table's error props. `rankMovers(quotes, kind, { limit, activeBy })`
is the pure ranking: gainers are change above zero, losers below zero (largest fall first), quotes with no change are
never a gainer or loser. Keyboard: Left/Right/Home/End move between tabs.

## MarketIndices

Index cards or a one-row strip (`variant="strip"`) with value, change, an optional trend and a market status. Props:
`indices` (`{ id, name, value, previousValue, history? }`, in points), `label`, `variant`, `state` or `session`
(shown through `MarketStatus`), `asOf`, `convention`, `fractionDigits`, `showTrend`, `loading`, `emptyLabel`. Index
points use two decimals in the change (they are scaled to hundredths for `PriceChange`). An unpublished value is a dash.

## MarketStatus and `getMarketSession`

`<MarketStatus state="open" />` shows open, pre-open, closed, halted or holiday as a word and an icon whose shape is
different for every state, inside a `role="status"` so a change is announced. Props: `state` or `session`, `labels`,
`detail`, `market`, `size`.

`getMarketSession(now, schedule, { halted })` is pure:

```ts
const schedule: MarketSchedule = {
  timeZone: 'America/New_York',
  sessions: [
    { state: 'pre-open', days: [1, 2, 3, 4, 5], start: '04:00', end: '09:30' },
    { state: 'open', days: [1, 2, 3, 4, 5], start: '09:30', end: '16:00', label: 'Regular hours' },
  ],
  holidays: [{ date: '2026-11-26', name: 'Thanksgiving' }],
};
getMarketSession(new Date(), schedule);
// { state, label?, localDate: '2026-03-09', localTime: '09:30', next: { state: 'closed', at: Date } | null }
```

Times are read in the schedule's IANA zone with `Intl`, so daylight saving is the platform's. `days` are 0 (Sunday) to
6; a window includes its start and excludes its end; a date in `holidays` is `holiday` all day; `halted: true` turns an
`open` or `pre-open` market into `halted` (halts come from the exchange, not the clock). `next` is the next change among
open, pre-open and closed within ten days (a halt is never predicted). It throws `RangeError` for an unknown zone,
malformed times or dates, a window that ends before it starts, or an invalid `now`. A wall time in the spring-forward gap
or the repeated autumn hour resolves to the earlier offset; real exchanges do not schedule there.

**`nepseSchedule` is an example, not authority.** It encodes pre-open 10:30 to 11:00 and continuous trading 11:00 to
15:00, Sunday to Thursday, `Asia/Kathmandu`, and has no holidays. NEPSE changes its hours and announces holidays by
notice: verify the hours against the current notice and supply your own `holidays`. Spread it to override:
`{ ...nepseSchedule, holidays }`.

## PriceLimitIndicator

Where the LTP sits between the day's lower and upper circuit limits, with an at-limit flag. Props: `ltp`, `lowerLimit`,
`upperLimit`, `previousClose` (marks the middle), `bandRate` (a decimal fraction string such as `'0.10'`, used with
`previousClose` when no limits are given), `symbol`, `money`, `labels`, `showFigures`. The exchange's published limits
are the authority; pass them when you have them. `circuitLimits(previousClose, '0.10')` computes `close ± close × rate` in
exact minor units, rounding each limit toward the close; many exchanges round to a tick, so prefer the published figures.
`limitPosition(ltp, lower, upper)` returns `{ state: 'at-upper' | 'at-lower' | 'within' | 'unknown', position (0..1),
outside }`. A price beyond a limit is reported as at that limit with `outside: true`.

A11y: the bar is an image whose name lists every figure and the state ("NABIL: Last price 512.30; Lower limit 457.20; …;
Within limits"); at a limit a pill with an arrow icon and words ("At upper circuit") sits in a `role="status"`. Missing or
inverted limits show "Circuit limits unavailable" instead of a bar.

## Watchlist

The stocks a person follows, in their order. Props: `quotes` (display order), `label`, `onReorder(symbols)`,
`onRemove(symbol)`, `labels`, `money`, `convention`, `showTrend`, `live`, `renderSymbol`, `emptyTitle`, `emptyBody`,
`emptyAction`. The move and remove buttons appear only when the matching callback is given; the callbacks only request, the
caller applies them (`moveItem(list, item, delta)` is the pure reorder).

Keyboard: every control is a real button. **Alt+ArrowUp / Alt+ArrowDown** on any of a row's buttons moves that row. Focus
stays on the control you used after a move (or on its partner if the row reached an end), and after a removal moves to the
neighbouring row's remove button, or to the list when it was the last. Each change is announced ("HDL moved to position 2
of 3", "NABIL removed").

Live updates: rows are keyed by `symbol` and rendered in the order passed, so new prices change text in place and nothing
jumps under the pointer. If you offer sorting, hold the order still while prices tick with `useStableOrder(sorted, keyOf,
sortId)` and re-sort only when the person chooses a sort.

## MarketHeatmap

A squarified treemap of symbols: area is the size (turnover, market cap), fill is the change on a seven-step diverging
scale, with a legend. Props: `items` (`{ id, label, name?, size, change }`, change in percent), `label`, `sizeLabel`,
`formatSize`, `scaleMax` (percent of the deepest colour, default 3), `aspect` (width over height, default 1.5; use about 1
on a phone), `convention`, `onSelect` (tiles become buttons), `labels`. `heatmapItemsFromQuotes(quotes, 'turnover' |
'volume')` builds items from quotes.

Pure helpers: `squarify(items, { width, height, x?, y? })` returns `{ rects, skipped }`. It is deterministic (largest
first, ties by input position); rectangle areas are proportional to size and tile the bounds with no overlap or gap; sizes
that are missing, zero, negative or not finite are not drawn and are listed in `skipped` (and under the map). `heatStep(change,
max)` maps a change to −3…3 (0 for a change that rounds to 0.00, `null` when missing).

A11y: colour is never the only signal (each tile prints an arrow and a signed change, and every tile has a full spoken name:
symbol, name, size, direction and percent); tiles too small for text are still named; the legend lists every step including
"Unchanged" and "No change data"; a "View data as a table" disclosure lists every item, including unsized ones, in a
scrollable, focusable region.

## MarketBreadth

Advances, declines and unchanged as one bar split in three, with the counts, their shares and the advance/decline ratio
printed beside it. Props: `advances`, `declines`, `unchanged` (counts; negative or non-finite count as 0), `label`, `extra`
(more counts under the bar: `{ id, label, value, tone? }`, for circuit hits or 52-week highs), `showRatio` (default true),
`convention`, `loading`, `size: 'sm'`, `labels`, `formatCount`. With every count at zero it says "No stocks have traded yet."

Pure helpers: `breadthOf(quotes)` counts from `{ ltp, previousClose }` (a missing price is unchanged, as exchanges report a
stock that did not trade); `advanceDeclineRatio(b)` is advances over declines, `null` with no declines.

A11y: the bar is an image named with every count; arrows and words carry direction; declines are hatched in forced colours.

## Decisions

- Quotes use bigint minor units to share `MoneyDisplay`/`PriceChange` and avoid float drift; index values are plain numbers
  because they are points, not money.
- Sorting is a pure helper plus controlled props, not state inside the table, so URL-backed and server-side sorting work.
- `nepseSchedule` has no holidays on purpose: they are announced yearly and must come from the caller.
- The heatmap lays out in a fixed virtual space and positions tiles in percent, so it is responsive without measuring.
