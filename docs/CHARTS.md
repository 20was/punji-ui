# Financial charts

This page covers the three original charts and the pure math under them: `CandlestickChart`, `PerformanceChart`, `DepthChart` and `@punji/ui/chart-math`.
The newer charts (waterfall, cash flow, net worth, Sankey, earnings, balance history, score radar, fair value, price target,
returns heat table, month grid, histogram, correlation matrix) are beta and documented on [design.punji.app](https://design.punji.app);
they share `ChartA11yShell` (`@punji/ui/chart-a11y`) and take exact `bigint` amounts. Optional canvas adapters for TradingView
Lightweight Charts and ECharts (`@punji/ui/lightweight-charts`, `@punji/ui/echarts`) are experimental.
All charts here are SVG drawn by this package (no chart library), display only, deterministic (the same props give the same pixels),
and take plain numbers. Styles: `@punji/ui/css/financial-charts.css` (in `styles.css`). The examples use synthetic NEPSE-style
data from `fixtures/market-data.ts`, not market data.

Shared behaviour:

- **Bad numbers are "no value", never zero.** Missing, `null`, `NaN` and infinities are gaps; the table says `none`.
- **One focus stop.** The plot is a named group (`aria-roledescription`, hint text). Left and Right step, Home and End jump,
  Escape clears. The focused point is announced in a polite live region and shown in a readout with a crosshair; the pointer
  does the same. A visually hidden `<table>` lists the values (the latest 500 candles or dates by default, `tableLimit`).
- **Colour is never the only cue.** Direction and series are also spelled out in words, dashes or shapes.
- **Responsive.** The SVG is as wide as its container (measured, `ResizeObserver`); heights are clamped.
- **Words are overridable** through `labels`; numbers through the `format*` props.
- Default price text is `NPR 487.50` from `Intl.NumberFormat('en-IN', { currency: 'NPR' })`. It is the platform formatter,
  not the exact bigint `@punji/ui/money` (which would add its weight to every chart). Pass `formatPrice` for exact money.

## CandlestickChart (`candlestick-chart`)

```tsx
<CandlestickChart label="NABIL daily" candles={candles} averages={[{ type: 'sma', window: 10 }]} />
```

Use it for OHLC per session with volume. Do not use it for a single line of closes (`PriceChart`) or order book size
(`DepthChart`).

| Prop | Notes |
| --- | --- |
| `candles` | `{ date: 'YYYY-MM-DD', open, high, low, close, volume? }`, oldest first |
| `variant` | `'candles'` (default) or `'bars'` (OHLC ticks); the older spelling of `mode="bars"` |
| `mode` | beta: `'candles'` (default), `'hollow'`, `'bars'`, `'heikin-ashi'`, `'line'`, `'area'`, `'baseline'`, `'high-low'` |
| `scale` | beta: `'linear'` (default), `'log'`, `'percent'` (change from the first close), `'indexed'` (first close is 100); needs `scales={priceScales}` |
| `scales` | beta: `priceScales` from `@punji/ui/price-scales`, the log, percent and indexed maths and compare lines; without it `scale` and `compare` are ignored |
| `compare` | beta: `{ label, points: { date, close }[] }[]` drawn as lines over the price, level with it on their first date; moves a linear or log axis to percent (needs `scales`) |
| `transform` | beta: `heikinAshiTransform` from `@punji/ui/heikin-ashi`, used by `mode="heikin-ashi"` (without it that mode draws plain candles) |
| `layers` | beta: `eventsLayer(events)` (`@punji/ui/candlestick-events`: `{ date, kind: 'dividend' \| 'split' \| 'earnings' \| 'custom', label, detail? }[]` on the time axis, Shift plus Left or Right jumps between them), `levelsLayer(levels)` (`@punji/ui/candlestick-levels`: `{ price, label, kind?: 'support' \| 'resistance' \| 'cost-basis' \| 'custom' }[]` as dashed lines with labels kept clear of each other) and `baselineLayer({ price? })` (`@punji/ui/candlestick-baseline`, the fill of `mode="baseline"`) |
| `indicators` | beta: descriptors from `rsiIndicator`, `macdIndicator`, `bollingerIndicator`, `vwapIndicator` (each its own module) |
| `volume` | volume pane; default on when any candle has a volume |
| `axis` | `'category'` (default, one slot per session) or `'time'` (spaced by date, gaps stay visible) |
| `hollowUp` | up candles as outlines, down filled |
| `convention` | per-chart override, `'green-up'` or `'red-up'`; default follows the theme (see below) |
| `averages` | `{ type: 'sma' \| 'ema', window, label? }[]`, computed over closes |
| `formatPrice`, `formatVolume`, `formatDate` | printing |
| `tableLimit` | latest N candles in the hidden table (default 500); the chart always uses all |
| `height`, `labels`, `testId` | height clamped to 140..640 |

Data rules: `low` must not exceed `open` or `close`, `high` must not be below them, every price finite, volume not
negative. A candle that breaks them is **not drawn**, is counted under the chart and stays in the table with the reason.
Across a width with less than 3px per candle, candles are aggregated (first open, last close, extreme high and low, summed
volume); the readout names the range. Non-trading days: the default category axis leaves no hole; `axis="time"` shows them.

Keyboard: Tab to the plot; Left and Right move one candle; Home and End; Escape. The live region says, for example
`14 Nov: up 0.28%, Open NPR 486.20, High …, Low …, Close NPR 487.50, Volume 41,000`. The chart is built on
`ChartA11yShell`, like the other native charts: one focus stop, a hint, a spoken summary of the whole series, a live region
and a hidden table.

### Price modes, scales, events, levels and indicators (beta)

All off by default; a chart without them draws and reads as before. Each feature is its own module and subpath, so a plain chart does not ship it: the props above that need a module (`transform`, `scales`, `layers`, `indicators`) carry the shared engine (`@punji/ui/candlestick-trading`, about 3 kB gzipped) in with it, and a prop whose module is not imported is ignored. Write your own layer by returning `{ id, engine: candlestickTrading, build(ctx) }`.

- **Modes.** Heikin Ashi is `heikinAshi(candles)` in chart-math, from TradingView's help: HA close = (O+H+L+C)/4, HA open =
  (previous HA open + previous HA close)/2, HA high = max(H, HA open, HA close), HA low = min(L, HA open, HA close); the first
  HA open is (O+C)/2. The table and live region print HA values to two more decimals than the prices were written with
  (never rounded to the currency's two) and the live region adds the actual close. `hollow` follows TradingView: a hollow
  body when the close is above the open, coloured by the close against the previous close, so the words say both. Direction is
  never colour alone: it is in the readout, the live region and the table (a Direction column once `mode` is set), and
  hollow or filled bodies, marker shapes and line dashes carry it in the drawing.
- **Scales.** `percent` and `indexed` are measured from the first close shown; `log` uses 1, 2, 5 ticks per decade. A scale
  the prices cannot support (log with a price at or below zero, percent or indexed with a first close at or below zero) falls
  back to linear and says so. With `compare`, a linear or log axis becomes percent; a compared series that starts later
  continues from where the price stood on its first date (`rebaseOnto`). The legend names every line; the table adds a
  column per compared series.
- **Events and levels.** Events are placed on the session of their date (or the last session before it); those outside the
  sessions shown are listed in the events table only. A level outside the price range shown is likewise only listed in the
  levels table. Level labels are spread apart (`spreadLabels`) so they never overlap.
- **Indicators.** Pure functions in `@punji/ui/chart-indicators`: `rsi(closes, 14)` (Wilder smoothing; checked against the
  StockCharts RSI worksheet), `macd(closes, 12, 26, 9)` (checked against the exact steady state of a straight line),
  `bollinger(closes, 20, 2)` (population deviation) and `vwap(candles)` (typical price weighted by volume, from the first
  session shown). The chart draws descriptors from `rsiIndicator`, `macdIndicator`, `bollingerIndicator` and `vwapIndicator`,
  each its own module, so a chart that imports none ships none of them or of the pane drawing. RSI and MACD are panes below
  the price (and volume) with a title, the latest value and axis levels; Bollinger and VWAP draw over the price (or in a pane
  with `placement: 'pane'`). Every indicator line adds a table column and a spoken value ("RSI 14 61.20, neutral").

## PerformanceChart (`performance-chart`)

```tsx
<PerformanceChart label="Portfolio against NEPSE" dates={dates} series={[portfolio, nepse]} periods={<MyPeriodSelector />} />
```

The first series is the portfolio (thickest line, with a gain and loss area against its start); the others are benchmarks
(colour and dash). By default every series is percent change from its own first real value (`normalize`), so rupees and index
points share a scale; `normalize={false}` plots raw values (`formatValue`, per-series `format`). `periods` is a slot for your
1M, 3M, 1Y, All control: slice `dates` and every series together. The legend is a row of toggle buttons (`aria-pressed`, Enter
or Space); the last visible series cannot be hidden. A line with more points than 2px each is reduced to each bucket's extremes.
A series whose first value is zero cannot be normalised and is not drawn. The hidden table lists the latest `tableLimit` dates
(default 500, as `CandlestickChart`; `labels.truncated` says how many are shown).

## DepthChart (`depth-chart`)

```tsx
<DepthChart label="NABIL depth" bids={bids} asks={asks} />
```

Cumulative bid and ask step areas around the mid price, with the spread under the chart. It takes the same `BookLevel`s as
`OrderBookDepth`, in any order: they are sorted best first, equal prices merged, invalid levels dropped. One side empty draws
that side only. A crossed book (best bid at or above best ask) draws both sides, shows no mid price and says so. Left and Right
move one price level; the readout says side, price, quantity and cumulative size.

## Price-only charts (`price-only-chart`, beta)

```tsx
import { PriceOnlyChart } from '@punji/ui/price-only-chart';
import { renkoType } from '@punji/ui/renko-type';

const box5 = renkoType({ box: '5' }); // hoist or useMemo
<PriceOnlyChart label="NABIL, 5 rupee Renko" bars={bars} type={box5} />
```

Renko, Kagi, Point and Figure, Line Break and Range bars drop time and draw only the price moves that matter. One renderer,
`PriceOnlyChart`, takes `bars` (`{ date, open?, high?, low?, close }` with prices as **decimal strings**) and a `type`
descriptor from its own subpath (`renko-type`, `kagi-type`, `point-figure-type`, `line-break-type`, `range-bars-type`), so a
page ships only the type it draws. The elements come from pure builders in `chart-price-only` (`renkoBricks`, `kagiLines`,
`pointAndFigure`, `lineBreak`, `rangeBars`): scaled bigint inside, decimal strings out (the scale is the most decimals any
input carries). Every element carries `fromBar`, `toBar`, `fromDate` and `toDate`, the source bars it covers; the readout, the
live region and the hidden table print them, since the axis is no longer time. Up and down are shape first (hollow brick with
an up triangle against solid with a down triangle, X against O, thin against thick) and always words too.

Rules, with sources (TradingView's help is primary; d3-kagi MIT, aticio/renko MIT and dhelm-pnf Apache-2.0 were read for the
algorithm shapes, no GPL or LGPL code was used):

| Type | Rule | Source |
| --- | --- | --- |
| Renko | box fixed or ATR (14, Wilder, rounded half up to the prices' decimals); a brick per box beyond the last brick; a reversal needs a box beyond the last brick's open edge (two-box). Source close, or low then high on an up bar and high then low on a down bar | tradingview.com/support/solutions/43000502284; reversal rule is ours, as aticio/renko |
| Kagi | reversal fixed or percent of the line's end, from closes; yang when a line passes the previous shoulder, yin when it passes the previous waist, split at that price | tradingview.com/support/solutions/43000502272; thickness from secondary sources and d3-kagi |
| Point and Figure | box size, reversal of N boxes (3); a price falls in the box at or below it; a column reverses N boxes under its top, starting one box below it | in.tradingview.com/support/solutions/43000502276, thismatter.com; dhelm-pnf for the shape |
| Line Break | a close past the last line adds a line; a reversal needs a close past the high or low of the last N lines (3) | tradingview.com/support/solutions/43000502273 |
| Range bars | every bar's high minus low is exactly the range; the next bar opens at the close; the forming bar is not drawn | the standard definition |

Unverified: TradingView's own first-brick anchor and tie handling are not documented, so a chart can differ by a brick at the
start; the advance-decline and percent-above-average definitions below follow the textbook, not a fetched primary source.

## BreadthChart (`breadth-chart`, beta)

```tsx
<BreadthChart mode="advance-decline" label="NEPSE A/D" days={days} />
<BreadthChart mode="percent-above-ma" label="Above 200-day" constituents={stocks} period={200} />
```

`advance-decline` plots the running total of advances minus declines (`advanceDeclineLine`, the counts `MarketBreadth` shows plus
a date). `percent-above-ma` plots the share of constituents whose close is above their own simple N-day average
(`percentAboveMA`): a close is above when `close * N > sum of the last N closes` in bigint, and the share prints as an exact
decimal, rounded half up. Both helpers are importable on their own from `chart-breadth`.

## Gain and loss colour convention

Charts take up and down colours from the theme's `--pu-color-gain` and `--pu-color-loss`. Set the convention once with
`createTheme({ finance: 'red-up' })` (China, Japan, South Korea and Taiwan show a rise in red); every chart then renders up
in red, once. The `convention` prop on `CandlestickChart`, `PerformanceChart`, `MarketHeatmap`, `MarketBreadth` and
`PriceChange` is an absolute per-instance override that cannot double-swap with the theme. Direction is never colour alone:
candles can be hollow (`hollowUp`), and values carry signs, arrows and words. See
[THEMING.md](THEMING.md#gain-and-loss-colour-convention).

## Chart math (`chart-math`)

Pure, no React or browser (enforced by `check-boundaries`): `niceTicks`, `bandScale`, `timeScale`, `validateOhlc`,
`isValidOhlc`, `reduceCandles`, `aggregateByPeriod` (calendar weeks, months, quarters, years), `downsampleIndices`, `sma`, `ema`,
`rebase`, `rebaseOnto` (a late-starting series continues from a reference level), `cumulativeDepth`. Property-tested with
fast-check (`test/chart-math.test.ts`): ticks cover the domain, are ascending, evenly spaced and nice; downsampling keeps the
endpoints and the global minimum and maximum; candle aggregation keeps open, close, extremes and total volume; an SMA is the
mean of its window and blank until it fills; an EMA stays inside the data range; cumulative depth is monotone, best first and
independent of input order.

## Performance

Rendering 1,500 candles (jsdom, one render, including the aggregation and the hidden table's latest 500 rows) is measured in
`test/financial-charts.test.tsx` ("renders 1,500 and 2,000 candles quickly"). SVG output is bounded by the width: at most one
candle per 3px, so a 1,440px screen draws at most about 450 candles whatever the input length.

Under live ticks (one candle, date or level changing at a time) only the changed candle mark and table row re-render;
measured at 10, 100 and 1,000 ticks a second and at 1k to 100k points in [PERFORMANCE.md](PERFORMANCE.md#charts-and-live-tweening).
Feed a chart a new array with only the changed objects replaced (the forming candle), not a fresh copy of every object.
