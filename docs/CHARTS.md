# Financial charts

Three charts and the pure math under them: `CandlestickChart`, `PerformanceChart`, `DepthChart` and `@punji/ui/chart-math`.
All are SVG drawn by this package (no chart library), display only, deterministic (the same props give the same pixels),
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
| `variant` | `'candles'` (default) or `'bars'` (OHLC ticks) |
| `volume` | volume pane; default on when any candle has a volume |
| `axis` | `'category'` (default, one slot per session) or `'time'` (spaced by date, gaps stay visible) |
| `hollowUp` | up candles as outlines, down filled |
| `convention` | `'green-up'` (default) or `'red-up'`, as `PriceChange` |
| `averages` | `{ type: 'sma' \| 'ema', window, label? }[]`, computed over closes |
| `formatPrice`, `formatVolume`, `formatDate` | printing |
| `tableLimit` | latest N candles in the hidden table (default 500); the chart always uses all |
| `height`, `labels`, `testId` | height clamped to 140..640 |

Data rules: `low` must not exceed `open` or `close`, `high` must not be below them, every price finite, volume not
negative. A candle that breaks them is **not drawn**, is counted under the chart and stays in the table with the reason.
Across a width with less than 3px per candle, candles are aggregated (first open, last close, extreme high and low, summed
volume); the readout names the range. Non-trading days: the default category axis leaves no hole; `axis="time"` shows them.

Keyboard: Tab to the plot; Left and Right move one candle; Home and End; Escape. The live region says, for example
`14 Nov: up 0.28%, Open NPR 486.20, High …, Low …, Close NPR 487.50, Volume 41,000`.

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
