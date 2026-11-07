# Chart coverage research for @punji/ui (2026-11-07)

Scope: what punji-ui ships, what world-class markets and personal-finance products show, which open-source chart
libraries matter, and a ranked, wave-grouped build plan. Research only: nothing in the repo was changed.

Conventions in this report:

- **[V]** verified against the cited source today. **[U]** unverified: no primary source found; treat as an assumption.
- GitHub numbers (stars, last push, latest release) come from `gh api repos/<repo>` and `.../releases/latest`, run
  2026-11-07. npm versions come from `npm view`. Bundle sizes come from the Bundlephobia API
  (`https://bundlephobia.com/api/size?package=<pkg>@<ver>`): minified and gzip size of the **whole entry**, not a
  tree-shaken build.

---

## 1. What punji-ui ships today

### 1.1 On `main` (v0.2.0 plus unreleased changesets)

All are SVG drawn by the package, no chart library, deterministic, responsive via `ResizeObserver`, never colour-only
(docs/CHARTS.md). Shared accessibility comes from `src/chart-a11y/ChartA11yShell.tsx`: a `<figure>`, one focus stop,
arrows/Home/End/Escape cursor, polite live region (`speak(index)`), optional spoken summary, visually hidden data table.
Users of the shell: ColumnChart, WaterfallChart, CashFlowChart, NetWorthChart, PerformanceChart, DepthChart, PriceChart
(financial). CandlestickChart has its own equivalent (focus stop, live region, hidden table of the latest 500 candles).

| Component (subpath) | What it draws | Capabilities |
| --- | --- | --- |
| `CandlestickChart` (`candlestick-chart`) | OHLC per session + volume pane | `variant` candles or OHLC bars; `hollowUp`; `axis` category or time (gaps visible); SMA/EMA overlays; `convention` green-up/red-up; invalid candles not drawn, listed with reason; aggregation below 3px per candle; keyboard cursor; hidden table (500) |
| `PerformanceChart` (`performance-chart`) | Portfolio vs benchmarks | percent-from-start normalisation or raw; toggle legend (`aria-pressed`); extremes-preserving downsample; `periods` slot |
| `PriceChart` (`financial`) | Single line with gaps | straight segments, gaps stay gaps, data table disclosure |
| `Sparkline` (`sparkline`) | Tiny trend line | decorative by default, `img` with label, extremes downsampling, dashed placeholder |
| `DepthChart` (`depth-chart`) | Cumulative bid/ask step areas | sorts/merges levels, crossed-book handling, spread readout, per-level keyboard |
| `ColumnChart` (`column-chart`) | Stacked columns per period | negatives below baseline, printed totals, built-in inspection, `mirror`/`net` |
| `WaterfallChart` (`waterfall-chart`, beta) | Bridge start to end | exact bigint `Money`; totals/subtotals; hatching + signs + triangles |
| `CashFlowChart` (`cash-flow-chart`, beta) | In above zero, out below, net line | bigint `Money`, surplus/deficit words |
| `NetWorthChart` (`net-worth-chart`, beta) | Assets stacked above, liabilities below, net line | bigint `Money`, series tokens not gain/loss colours |
| `RangeSelector` (`range-selector`, beta) | 1D..All segmented control | `filterByRange` pure, UTC |
| `MarketHeatmap` (`market-heatmap`) | Treemap: area = size, fill = change | pure `squarify`, diverging legend, signed labels, table of all items. **Flat: no sector/industry grouping.** |
| `MarketBreadth` (`market-breadth`) | Advancers/decliners/unchanged split bar | A/D ratio, circuit counts, hatched in forced colours |
| `PortfolioAllocation` (`portfolio-allocation`) | Donut or stacked bar | largest-remainder percentages summing to 100, "Other" bucket, table |
| `Meter` family (`meter`) | MeterBar, RangeBar, ShareBar, ShareDonut, DistributionBar | composable bars; RangeBar suits 52-week range and fair-value position |
| `Bars` (`bars`) | SplitBar, DivergingBar, NetBar | inline bars beside figures |
| `RiskMeter` (`risk-meter`) | Half-dial riskometer, 3–8 levels | level always in words |
| `DividendHistory` (`dividend-history`) | Stacked ColumnChart by BS fiscal year + table | cash/bonus/rights, yield on value/cost |
| `Breakdown` (`breakdown`) | Description-list "how a total is made" | not a chart; no arithmetic |
| `chart-math` | `niceTicks`, `bandScale`, `timeScale`, `validateOhlc`, `reduceCandles`, `aggregateByPeriod`, `downsampleIndices`, `sma`, `ema`, `rebase`, `rebaseOnto`, `cumulativeDepth` | pure, property-tested |
| `chart-scale` | value-line domain helpers | `off` marker for out-of-domain second series |

### 1.2 Open PRs and branches

- **PR #95 `feat/parity-charts`** (open): PerformanceChart layers (`reference` line, `drawdown` band, dotted
  `contributions`, `endLabels`, `rebase={100}` compare, `axis="quiet"`), `MonthGrid` (year x month, BS or AD heads),
  `ReturnsHeatTable`, `Histogram` (on ChartA11yShell), `CorrelationMatrix`; `squarify` returns empty rects instead of
  throwing. So after #95: drawdown band, indexed-to-100 compare, monthly returns heat table, histogram and correlation
  matrix are covered.
- **PR #94 `feat/parity-market-primitives`**: BarList, RatingScale, MonthStrip, InstrumentHeader etc. (no new charts).
- **`feat/canvas-chart-adapters`** (local branch): contains no chart-adapter work. Its only commits not on main are
  `chore(release): version packages (#69)` and `feat: icons (#92)`. Treat chart adapters as not started.
- The web-parity plan (`docs/migration/parity-kit-and-shared.md`) still lists as missing: `PriceLevelChart` +
  `ProfileRail` (volume at price, L), `FlowWaterfall` (now covered by WaterfallChart), a standalone `chart-inspect`
  layer, `FloorGauge` (S), `MarkToggleList` (S). punji-web currently uses the licensed TradingView Advanced Charts
  library for its full chart (`charts/tv/*`), runtime-loaded; that stays out of scope (punji-web is hands-off).

### 1.3 What is missing (summary)

No radar/score chart, no Sankey, no scatter/bubble, no grouped treemap, no yield curve / term-structure, no fan chart,
no options payoff / volatility smile, no volume profile, no non-time-based price charts (Renko, Kagi, P&F, Line Break,
Range), no Heikin Ashi, no log / percent price scale on candles, no indicator sub-panes (RSI, MACD), no event markers
on price charts (earnings, dividends, splits, insider trades), no analyst price-target chart, no EPS estimate-vs-actual
chart, no seasonality overlay, no style box, no chart adapters for third-party renderers.

---

## 2. Reference products

### 2.1 Simply Wall St

**The Snowflake** (primary source: SWS's own model document, `SimplyWallSt/Company-Analysis-Model`, `MODEL.markdown`,
https://github.com/SimplyWallSt/Company-Analysis-Model/blob/master/MODEL.markdown) **[V]**:

- Five assessment criteria: Value, Future performance, Past performance, Health, Dividends.
- "for each assessment criteria, there are 6 individual checks performed (giving a total of 30 checks for each stock)";
  a passed check scores 1; the axis value is the count of passes, 0–6.
- "The greater the total number of successful checks the larger the snowflake"; "the greater the number of successful
  checks the more 'green' the snowflake - the fewer the more 'red'". So colour follows the **total** score (0–30),
  shape follows the per-axis scores.
- Reading: a low axis is not disqualifying (a low Dividends score can mean a growth company reinvesting). "Four out of
  five axis only change when new company or analyst level data is available"; Value is the one sensitive to price.
- Example Value checks: DCF fair value at least 20% above price (1 point), at least 40% (1 point), PE below market,
  PE below industry, PEG in 0–1, PB below industry.
- **Licence**: the README says the model in MODEL.markdown is under **CC BY-NC-SA 4.0** (non-commercial) **[V]**. We
  must not ship SWS's checks as defaults or copy their text; a generic "N axes, 0..max score" component is fine because
  the score values come from the caller. "Snowflake" as a trade name: **[U]** whether it is a registered mark; name ours
  `ScoreRadar` to be safe.
- The help-centre article (https://support.simplywall.st/hc/en-us/articles/360001740916) returned 403 to fetch; a search
  summary of it agrees with the above.

**Other SWS visuals:**

- "Revenue & Expenses Breakdown: How X makes and spends money. Based on latest reported earnings, on an LTM basis" on
  `/past` pages, alongside "Earnings and Revenue History" (revenue, earnings, G+A, R&D) **[V]**
  (https://www.simplywall.st/stocks/se/real-estate-management-and-development/sto-wall-b/wallenstam-shares/past).
  That the breakdown is drawn as a **Sankey**: **[U]** — only a forum post describes a beta "graphic" of revenue,
  operating costs and the cost of doing business (https://strawman.com/forums/topic/7228). Comparable product with a
  Sankey per company: 10q10k (https://alternativeto.net/software/10q10k/about) **[V as a claim of that listing]**.
- "Debt to Equity History" on `/health` pages, with the ratio and its 5-year change **[V]**
  (https://www.simplywall.st/stocks/gb/real-estate-management-and-development/bats-chixe-wallbs/wallenstam-shares/health).
- "Ownership Breakdown" (institutions, individual insiders, private companies, state/government, general public, %)
  and "Insider Trading Volume" plus "Recent Insider Transactions" (date, value, role, shares, price) on `/ownership`
  pages **[V]** (https://simplywall.st/stocks/us/retail/nyse-w/wayfair/ownership).
- Share price vs fair value: present in valuation summaries ("how far the stock sits above or below" fair value) **[V]**
  (https://simplywall.st/tr/stocks/au/retail/chia-tpw/temple-webster-group-shares). The exact bar design (green
  undervalued / red overvalued zones) **[U]**.
- Analyst price targets, dividend history chart, earnings & revenue growth forecast chart: present on SWS pages per
  general knowledge **[U]** (pages return 403 to fetch).

### 2.2 TradingView

- Chart-type articles in TradingView's help centre (https://tradingview.com/support/folders/43000547460) **[V]**:
  bars, candlesticks, hollow candles, volume candles, line, line with markers, step line, area, HLC area, baseline,
  columns, high-low, volume footprint, TPO (time price opportunity), session volume profile, Heikin Ashi, Renko, line
  break, Kagi, point & figure, range; plus spread charts.
- Charting Library docs: the standard group (bars … Heikin Ashi) is in Advanced Charts; Renko, P&F, Line Break and Kagi
  only in Trading Platform; these four are built from lower-timeframe OHLC and do not work on tick intervals **[V]**
  (https://www.tradingview.com/pine-script-docs/v5/concepts/non-standard-charts-data).
- **Construction rules** (TradingView help, all **[V]**):
  - Heikin Ashi (https://www.tradingview.com/support/solutions/43000619436): HA open = (prev HA open + prev HA close)/2;
    HA close = (O+H+L+C)/4; HA high = max(H, HA open, HA close); HA low = min(L, HA open, HA close).
  - Renko (https://www.tradingview.com/support/solutions/43000502284): box size Traditional (fixed), ATR (default 14),
    or Percentage of last close (default 1%, repaints); source Close or OHLC; a brick forms when price moves at least
    one box beyond the last brick; one brick per column. (The classic "2-box reversal" rule is **not** stated there.)
  - Kagi (https://www.tradingview.com/support/solutions/43000502272): reversal Traditional / ATR / Percentage; lines
    from closes; a reversal draws a shoulder/waist and starts a line the other way. Yang (thick) / yin (thin) thickness
    switching on breaking the prior shoulder/waist is described by secondary sources only
    (https://www.luxalgo.com/library/concept/kagi/) **[U from primary]**.
  - Point & Figure (https://in.tradingview.com/support/solutions/43000502276): box size ATR / Traditional / Percentage;
    reversal = box size x reversal amount (classic 3-box per secondary sources,
    https://thismatter.com/money/technical-analysis/point-and-figure-charts.htm); source Close by default; optional
    "one step back building".
  - Line Break (https://www.tradingview.com/support/solutions/43000502273 via search summary): new line when close
    exceeds the high/low of the previous N lines (N = "Number of Lines", typically 3) **[V via summary]**.
- **Scales**: log, percent and indexed-to-100 are standard; verified in Lightweight Charts' `PriceScaleMode` enum
  (Normal, Logarithmic, Percentage relative to first visible value, IndexedTo100) **[V]**
  (https://tradingview.github.io/lightweight-charts/docs/api/enumerations/PriceScaleMode).
- **Volume profile**: value area = range holding a set share of volume, "typically 70%"; built from the Point of
  Control (row with most volume) outward row by row; profile types fixed range, periodic, session, session HD,
  visible range **[V]** (https://www.tradingview.com/wiki/Volume_Profile).
- **Seasonals**: chart mode draws one line per year (regular or percent scale), table mode month-by-month **[V]**
  (https://in.tradingview.com/symbols/AOL2USD/seasonals/).
- **Drawing tools**: TradingView's full tool count **[U]**. Representative open set verified in KLineChart's source
  (`src/extension/overlay`): segment, ray, straight/horizontal/vertical lines, price line, price channel, parallel
  lines, Fibonacci line, annotation, tag, brush **[V]** (https://github.com/klinecharts/KLineChart).

### 2.3 Finviz

Finviz's own help (https://finviz.com/help/maps) does not spell out the encoding in text **[V that it doesn't]**.
Secondary sources: box area = market cap, colour = performance over the period (green up, red down, intensity =
magnitude), grouped by sector **[U from primary]** (https://discussion.fool.com/t/finviz-market-heat-map/101468,
https://fffinstill.com/learning/concepts/s-p-500-heatmap). TradingView has the same pattern with drill-down
(https://in.tradingview.com/support/solutions/43000766446) **[V title only]**. Implication: our `MarketHeatmap` needs a
**grouping level** (sector → industry → symbol) with group labels and drill-in.

### 2.4 Koyfin, Morningstar, Yahoo, Bloomberg-style, others

- **Yield curve** (Koyfin): plots government yields by tenor and compares against past dates; a 0-month tenor = policy
  rate **[V]** (https://koyfin.com/help/release-notes/yield-curves). US Treasury publishes daily par yield curve
  (CMT) rates by tenor (1-month upward) **[V]**
  (https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=d).
- **Futures term structure** (contango/backwardation curve): no primary source fetched **[U]**; same renderer as a
  yield curve (category tenor axis).
- **Morningstar Style Box**: 3x3 grid, size (large/mid/small) by style (value/blend/growth); methodology revised 2024
  **[V]** (https://en.wikipedia.org/wiki/Morningstar_Style_Box,
  https://www.morningstar.com/investing-terms/stock-style-box). "Morningstar Style Box" is Morningstar's name: ship it
  as a generic `StyleGrid`.
- **Fan chart**: Bank of England since Feb 1996; each pair of same-shade bands holds 10% (narrow) / 30% (wide)
  probability **[V]** (https://www.bankofengland.co.uk/-/media/boe/files/inflation-report/2017/fan-charts-nov-2017,
  1998 explainer https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/1998/the-inflation-report-projections-understanding-the-fan-chart).
  Personal-finance use: retirement / goal projections (percentile bands).
- **Options**: payoff (P/L vs underlying) with breakevens where the curve crosses zero, at expiry and at earlier dates,
  IV slider **[V]** (https://optionstrat.com/blog/options-profit-calculator-tutorial). Volatility smile/skew = IV vs
  strike per expiry; surface adds expiry axis; term structure = IV across maturities **[V general definition]**
  (https://en.wikipedia.org/wiki/Volatility_smile).
- **Analyst price targets**: low / mean (median) / high plus current price and implied upside **[V as data fields;
  chart layout U]** (https://market-mosaic.vercel.app/info). **EPS estimate vs actual** (last 4 quarters, beat/miss)
  **[V as data; layout U]**.
- **Drawdown / rolling returns / efficient frontier** (Portfolio Visualizer): drawdown table (start, end, length,
  recovery, depth) from monthly returns; rolling-period returns; historical efficient frontier **[V via secondary]**
  (https://algotrading101.com/learn/portfolio-visualizer-guide/). Risk/return scatter on PV **[U]** (common in
  Morningstar/Koyfin-style tools, not verified).
- **Market breadth** beyond counts (A/D line, % above 200-day MA), **economic calendar**, **earnings calendar**:
  common across Yahoo/Investing/Koyfin **[U]** (no primary fetched). Calendars are tables/lists, not charts.
- **Bloomberg Terminal visuals**: no public primary source **[U]**; excluded from claims.

---

## 3. Open-source chart libraries

Stats as of 2026-11-07 (GitHub API, npm, Bundlephobia whole-entry sizes).

| Library | Licence | Stars | Latest release | Size min / gzip | Rendering | A11y | Financial types |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TradingView Lightweight Charts | Apache-2.0 **+ attribution**: "add the attribution notice from the NOTICE file and a link to https://www.tradingview.com/"; `attributionLogo` option offered (README) | 17.8k | v5.2.1, 2026-08-12 | 194 kB / 61.6 kB | Canvas | none documented | Area, Bar, Baseline, Candlestick, Histogram, Line + custom series plugins; log/percent/indexed scales |
| KLineChart | Apache-2.0 | 4.3k | v10.1.0, 2026-10-14 | 228 kB / 58.7 kB (README: "only 50k under gzip") | Canvas | none documented | candles, ~27 indicators (MACD, RSI, BOLL, KDJ…), ~16 drawing overlays |
| Apache ECharts | Apache-2.0 | 67.7k | 6.1.0, 2026-05-19 | 1,115 kB / 368 kB (full) | Canvas or SVG | `aria` auto description + decal patterns, off by default; keyboard not documented (handbook) | candlestick, boxplot, sankey, treemap, sunburst, radar, heatmap, parallel, themeRiver, gauge, funnel |
| D3 | ISC | 113.9k | v7.9.2, 2026-11-03 | modular | SVG/Canvas (you draw) | yours | primitives |
| d3-sankey | BSD-3-Clause | 948 | v0.12.3, 2019 (last push 2023) | 8.4 kB / 2.8 kB | layout only | n/a | Sankey layout (6 relaxation iterations default, `sankeyJustify` default) |
| d3-hierarchy | ISC | 1.3k | v3.1.3, 2026-11-03 | 14.8 kB / 5.8 kB | layout only | n/a | treemap (squarify, resquarify), partition, pack |
| visx (Airbnb) | MIT | 21.1k | v4.0.0, 2026-06-11 | modular | SVG React primitives | yours | primitives |
| Recharts | MIT | 27.7k | v3.10.1, 2026-07-25 | 562 kB / 150 kB | SVG | `accessibilityLayer` keyboard; default-on in v3 **[U]** | no candlestick built in; Sankey, Treemap, Radar, Funnel |
| Nivo | MIT | 14.1k | v0.99.0, **2025-05-23** (slowing) | `@nivo/sankey` 191 kB / 63 kB | SVG, Canvas, HTML | partial | sankey, radar, treemap, heatmap, bump, calendar |
| uPlot | MIT | 10.6k | 1.6.32, **2025-03-14** (pushes continue) | 50.8 kB / 21.9 kB | Canvas 2D | none | time series, lines, areas, OHLC, bars; 166k points in 25 ms (README) |
| Plotly.js | MIT | 18.4k | v4.2.0, 2026-10-29 | dist-min 4.65 MB / 1.41 MB | SVG + WebGL | weak | candlestick, ohlc, waterfall, sankey, treemap, surface (3D), funnel, indicator |
| Vega-Lite | BSD-3-Clause | 5.5k | v6.5.0, 2026-10-08 | 281 kB / 90 kB (+ vega runtime) | Canvas/SVG | aria description | grammar; candlestick via composition |
| Chart.js | MIT | 67.8k | v4.6.1, 2026-10-22 | 205 kB / 69.6 kB | Canvas | canvas fallback content only | radar etc.; financial via plugin |
| chartjs-chart-financial | MIT | 811 | v0.2.1, **2024-03-23** | — | Canvas | — | candlestick, OHLC (stale) |
| Observable Plot | ISC | 5.4k | v0.6.19, 2026-11-05 | 381 kB / 127 kB | SVG | `ariaLabel`/`ariaDescription` | grammar; candles via rules+bars |
| Apache Superset | Apache-2.0 | 75.4k | 6.1.0, 2026-05-13 | app, not a library | — | — | its charts are plugins, mostly `plugin-chart-echarts` |
| react-financial-charts | MIT | 1.4k | v2.0.1, **2023-05-13**; last push 2024-03 | — | Canvas | — | candles, indicators (effectively unmaintained) |
| techan.js | MIT | 2.4k | 0.8.0, **2016**; last push 2020 | — | SVG (d3 v3/v4) | — | **abandoned** |
| AntV G2 | MIT | 12.7k | v5.4.8, 2026-01-06 | — | Canvas/SVG | — | grammar incl. candles |
| Highcharts (+ Stock) | **commercial** (repo: "Read more on licensing alternatives", shop.highcharts.com); npm 13.1.1 | 12.5k | — | — | SVG | strongest: accessibility module (keyboard, screen reader, sonification) included with every licence | full stock suite |
| amCharts 5 | **linkware**: free incl. commercial only if the branding link is not hidden or altered (LICENSE) | 449 | 5.21.5, 2026-10-26 | — | Canvas | yes (docs, not checked) | stock chart |

Sources: https://github.com/tradingview/lightweight-charts (README licence section),
https://tradingview.github.io/lightweight-charts/docs/series-types, https://github.com/klinecharts/KLineChart,
https://echarts.apache.org/handbook/en/best-practices/aria/, `apache/echarts/src/chart`, `plotly/plotly.js/src/traces`,
https://github.com/d3/d3-sankey, https://github.com/leeoniya/uPlot, https://highcharts.com/docs/accessibility/accessibility-module,
`amcharts/amcharts5/LICENSE`, `apache/superset/superset-frontend/plugins`, https://github.com/recharts/recharts/discussions/4484.

### 3.1 Recommendation

**(a) Reimplement natively in SVG** (dependency-free, ChartA11yShell, exact money): everything in the plan below.
Reasons: the kit's edge is accessible, deterministic, exact-money charts (docs/research/COMPETITIVE-2026.md: canvas libs
have "no DOM for screen readers, no table fallback; prices are floats"). The layouts needed are small and well
documented: squarified treemap (already ours), Sankey (port the idea of d3-sankey; it is BSD-3-Clause, so porting with
the notice kept is allowed, but ~300 lines of our own is cleaner), radar, scatter, fan bands, piecewise-linear payoff,
brick/column transforms (pure functions in `chart-math`).

**(b) Optional adapters** (like `tanstack-table` / `ag-grid` / `mui-x-grid`: optional peer, own subpath, never in core,
ChartA11yShell wraps the third-party canvas so the table, live region and keyboard cursor still exist):

1. **`@punji/ui/lightweight-charts`** (first): best size/feature ratio for high-frequency trading screens (live ticks,
   pan/zoom, 10k+ bars, custom series). Adapter must render the attribution (we cannot hide it; expose
   `attributionLogo` default true and document the NOTICE requirement). Maps our decimal-string prices to numbers for
   drawing only; the readout and table print from the original strings.
2. **`@punji/ui/klinecharts`** (second, optional): when an app needs built-in drawing tools and 25+ indicators without
   TradingView's licensed library. Apache-2.0, ~59 kB gzip.
3. **`@punji/ui/echarts`** (later, only on demand): for 3D-free exotic types (sunburst, parallel, themeRiver, large
   heatmaps) in back-office dashboards; register only the needed modules.
4. **Plotly.js** only as a documented recipe for a 3D volatility **surface** (1.4 MB gzip is too heavy to adapter-ise).

**(c) Avoid**: techan.js (abandoned 2016), react-financial-charts (no release since 2023), chartjs-chart-financial
(stale 2024; Chart.js canvas has no a11y), Nivo for new work (no release since 2025-05), Recharts in core (150 kB
gzip, float values; fine for app teams but no gain over ours), Highcharts and amCharts (non-OSS / linkware: a
design system cannot impose licence fees or branding on users; Highcharts' a11y module is the benchmark to match,
not a dependency), Vega/Vega-Lite/Observable Plot (grammar runtimes; heavy for a component library; good prototyping
tools), TradingView Advanced Charts / Trading Platform (licensed, cannot be redistributed; apps load it themselves).

---

## 4. Open-source algorithm references

Never copy code from GPL/LGPL/NC sources; reading for the algorithm idea is fine, but cite and write our own.

| Topic | Repo | Licence | Notes |
| --- | --- | --- | --- |
| Snowflake model | SimplyWallSt/Company-Analysis-Model (1.7k★, last push 2024-11) | CC BY-NC-SA 4.0 (model text) | 5 axes x 6 checks, colour by total. **Do not ship their checks**; caller supplies scores. |
| Sankey layout | d3/d3-sankey | BSD-3-Clause | Node depth by longest path; `sankeyJustify`; Gauss-Seidel-style relaxation, 6 iterations; link widths = value. Porting allowed with notice. |
| Sankey (flow-ordering) | ricklupton/d3-sankey-diagram (123★, pushed 2026-11-05) | MIT | Handles loops/reversed links; useful for P&L where some flows go back (tax credit). |
| Income statement Sankey | MrMuhannadObeidat/incomeStatement_Sankey, feiyuggg/income-statement-sankey-skill | MIT (1★ each) | Small; data model reference only (revenue → gross profit/cost of revenue → operating income/opex → net income/tax). Reference article: https://zhenmao.github.io/income-statement-waterfall-vs-sankey |
| Renko | aticio/renko | MIT | Python, small; brick generation from closes. ChillarAnand/stocktrends (Renko, LineBreak, PnF) is **GPL-3.0: read only**. |
| Point & Figure | cjknox/PyPnF (LGPL-3.0: read only), kncsolutions/dhelm-pnf-chart-generator (Apache-2.0) | — | Box/reversal column building; Apache one is safe to learn from. |
| Kagi | arpitnarechania/d3-kagi | MIT | d3 implementation: `reversalType` diff/pct, `reversalValue`, yang/yin thickness. Closest JS reference. |
| Heikin Ashi | formula from TradingView help (above) | — | 10 lines; no repo needed. |
| Volume profile / market profile | bfolkens/py-market-profile (409★) | BSD (LICENSE: "BSD License, Copyright (c) 2017, Brad Folkens") | POC, value area expansion, TPO. Also TradingView wiki for the 70% expansion rule. |
| Drawing tools on LWC | deepentropy/lightweight-charts-drawing (MIT, 147★), difurious/lightweight-charts-line-tools (Apache-2.0, 139★) | permissive | Useful for the LWC adapter, not for core. |
| Options payoff | hashABCD/opstrat (169★) | MIT | Python; multi-leg payoff at expiry (iron condor etc.). Piecewise-linear sum of legs. |
| mplfinance | matplotlib/mplfinance (4.5k★) | Matplotlib/PSF-style permissive licence (LICENSE "License agreement for mplfinance", GitHub shows NOASSERTION) | Has renko and pnf types; algorithms readable. Confirm licence wording before porting **[U]**. |

---

## 5. Gap analysis and plan

### 5.1 Data model rules (apply to every chart below)

- Money amounts: `Money` (bigint minor units + currency) from `@punji/ui/money`; sums and differences in bigint; drawn
  as numbers only for pixel positions.
- Prices, strikes, yields, IV, scores: **decimal strings** (`'487.50'`, `'4.38'`) parsed once to number for drawing; the
  readout, live region and hidden table print the original string. Counts: `number`.
- Dates: `'YYYY-MM-DD'` (UTC), as CandlestickChart. Missing = gap, never zero.
- A11y: every chart wears `ChartA11yShell` (hidden table, spoken summary, keyboard cursor), never colour-only (shape,
  hatch, sign, words), `convention` green-up/red-up respected, `labels` overridable.

### 5.2 Ranked list

Rank = (products that use it x audience reach) / size. "Products" lists where verified above; [U] where not.

| # | Chart | What it shows | Data model | Interaction | A11y (shell) | Native/adapter | Size | Products |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **PriceSeriesChart modes** (extend CandlestickChart): line, area, baseline, HLC area, step, columns, high-low, **Heikin Ashi** (transform in chart-math) | Same OHLC data, other renderings | `Candle` with decimal-string OHLC (or keep numbers + `formatPrice` for back-compat); `mode` prop; `heikinAshi(candles)` pure | Existing cursor; mode switch is caller UI | Readout says mode; HA readout shows HA and real close | Native | M | TradingView [V], every broker |
| 2 | **Price scale modes + compare** | Log, percent from first visible, indexed to 100, overlay of other symbols | `scale: 'linear' \| 'log' \| 'percent' \| 'indexed'`; `compare: {label, closes}[]` | Toggle; cursor reads all series | Table adds compare columns; summary names scale | Native | M | TradingView/LWC `PriceScaleMode` [V] |
| 3 | **Event markers + reference lines on price charts** | Earnings, dividends, splits, insider buys/sells, alerts, target price line | `events: {date, kind, label, amount?: Money}[]`; `levels: {price: string, label}[]` | Markers are cursor stops (Shift+arrows jump events) | Each event a table row + spoken; marker shape per kind | Native | M | SWS insider transactions [V], Yahoo [U] |
| 4 | **ScoreRadar** (Snowflake-style) | N axes (3–8), score 0..max per axis, area coloured by total on a sequential scale; compare overlay of 2–3 entities | `axes: {key, label, score: number, max: number, note?}[]`; `compare?` | Arrows step axes; hover axis | Table axis/score/max; summary "Total 21 of 30: strongest Health 6/6, weakest Dividend 1/6"; colour backed by printed total | Native | S–M | Simply Wall St [V] |
| 5 | **SankeyChart** (income-statement flow) | Revenue → cost of revenue / gross profit → opex / operating income → tax / net income; also budget "where money went" | `nodes: {id, label}[]`, `links: {source, target, amount: Money, kind?: 'profit'\|'cost'}[]`; one currency; bigint conservation check per node | Arrow through nodes, Tab-free; link focus with Shift; highlight path | Table: from, to, amount, share of revenue; summary "Revenue X; 62% to costs; net income Y (margin Z%)" | Native (d3-sankey ideas, BSD) | L | SWS revenue & expenses [V section, U Sankey], 10q10k [V], budgeting apps (Actual Budget sankey report, https://actualbudget.org/docs/experimental/sankey-report) |
| 6 | **Grouped MarketHeatmap** | Sector → industry → symbol treemap, group headers, drill-in, period selector | `HeatmapItem` + `group: string[]`; size number, change decimal string | Enter drills into group, Escape up | Table grouped by sector with subtotals; summary "Tech −1.2% (weight 31%)" | Native (extend squarify) | M | Finviz [U], TradingView heatmaps [V title] |
| 7 | **FairValueBar** | Price vs estimate with under/over-valued zones and % gap | `price: string, fairValue: string, bands?: {from%, to%, label}[]` | none / single focus | Text "Trading 23% below estimated fair value"; zones hatched | Native (on RangeBar) | S | SWS [V] |
| 8 | **PriceTargetChart** | 12-month price history then a fan to low/mean/high analyst target; upside % | `history: {date, close: string}[]`, `targets: {low, mean, high, median?: string}`, `analysts: number` | Cursor along history; targets as stops | Table + "Mean target 540, 11% above" | Native | M | SWS/Yahoo [U layout; V fields] |
| 9 | **EarningsChart** | EPS estimate vs actual per quarter (dots, beat/miss), plus revenue/earnings bars and forecast region | `quarters: {period, estimate?: string, actual?: string, revenue?: Money, earnings?: Money}[]`; forecast flag | Arrow quarters | Words "beat by 0.04 (3%)"; shape filled=actual, hollow=estimate | Native | M | Yahoo [V data], SWS earnings history [V] |
| 10 | **VolumeProfile** (+ ProfileRail) | Horizontal volume-at-price histogram beside price; POC, VAH/VAL (70% default) | `rows` computed by `volumeProfile(candles, {rows, valueArea: 0.7})` pure; volume numbers, prices decimal strings | Up/Down step price rows | Table price row, volume, share, in-value-area; summary names POC and VA | Native | L | TradingView [V], punji-web parity item |
| 11 | **Indicator panes** | RSI, MACD (+signal/histogram), Bollinger bands, VWAP, ATR in chart-math + stacked sub-panes sharing x | `indicators: [{type:'rsi', period:14}, …]` | Cursor synced across panes | Table gets indicator columns; overbought/oversold in words | Native | M | TradingView, KLineChart [V indicator list] |
| 12 | **YieldCurveChart** (+ term structure) | Yield by tenor, compare to past dates, inversion highlighted (2y > 10y); same for futures curve | `curves: {label, date, points: {tenor:'1M'\|'2Y'…, yield: string}[]}[]` | Arrow tenors; series toggles | Table tenor x date; summary "Inverted between 3M and 5Y" | Native | M | Koyfin [V], US Treasury data [V] |
| 13 | **FanChart** | Projection percentile bands (10/25/50/75/90) for retirement, goal or forecast | `history`, `projection: {date, p10, p25, p50, p75, p90: Money \| string}[]`; band labels | Cursor over horizon | Table per date of bands; summary "In 2045, median X; 1 in 10 below Y" | Native | M | Bank of England [V], robo-advisers [U] |
| 14 | **DrawdownChart + RollingReturnsChart** | Underwater curve (% below peak) and rolling N-period returns | from `closes` via `drawdownOf` (PR #95) and new `rollingReturns(closes, window)` | Cursor; worst drawdown stop | Table: max drawdown, start/trough/recovery dates | Native | S each (M together) | Portfolio Visualizer [V secondary] |
| 15 | **RiskReturnScatter** | Volatility (x) vs return (y), bubble size = weight, quadrants, optional frontier line | `points: {id, label, risk: string, ret: string, size?: Money}[]` | Arrow by x order; Tab-free | Table; summary names top-left and bottom-right points; shapes per group | Native | M | Portfolio Visualizer frontier [V secondary], Morningstar [U] |
| 16 | **OptionsPayoffChart** | P/L vs underlying at expiry (piecewise linear from legs) plus optional "today" curve supplied by caller; breakevens, max profit/loss | `legs: {type:'call'\|'put'\|'stock', side, strike: string, premium: string, qty}[]`, `multiplier`; at-expiry P/L computed exactly in decimal; curve points from caller | Arrow along price; breakevens as stops | "Breakeven 512.40 and 547.60; max loss 1,240 between …" | Native | M | OptionStrat [V] |
| 17 | **VolatilitySmile / IV grid** | IV by strike per expiry (lines); strike x expiry heat grid as the 2D "surface" | `expiries: {date, points: {strike, iv: string}[]}[]` | Arrow strikes; switch expiry | Table; ATM and skew in words | Native (grid reuses heat cells from PR #95); 3D surface only via Plotly recipe | S–M | general options tools [V def] |
| 18 | **Non-time-based family: Renko, Kagi, PointFigure, LineBreak, RangeBars** | Price movement filtered by box/reversal, time axis dropped | pure transforms in chart-math: `renko(closes,{box\|atr\|percent})`, `kagi`, `pointFigure({box, reversal:3})`, `lineBreak({lines:3})`, `rangeBars`; render as bricks/columns | Arrow bricks/columns; readout gives date range per brick | Table per brick: direction, from, to, dates; summary "12 up, 7 down bricks; last reversal on …" | Native | S each transform, M renderers (L family) | TradingView [V] |
| 19 | **SeasonalityChart** | One line per year over Jan–Dec (or percent), plus average | `years: {year, points: {dayOfYear\|month, value: string}[]}[]` | Arrow months; year toggles | Table month x year (pairs with MonthGrid) | Native | M | TradingView Seasonals [V] |
| 20 | **StyleGrid** (3x3 style box) | Size x style placement, optional weights per cell, history trail | `cells: {size:'large'\|'mid'\|'small', style:'value'\|'blend'\|'growth', weight?: string}[]` | Arrow cells | Table; "Large growth, 64%" | Native | S | Morningstar [V] |
| 21 | **Breadth lines** (extend MarketBreadth) | Advance-decline line, % above 50/200-day MA | `days: {date, advances, declines, unchanged, pctAbove200?: string}[]` | Cursor | Table | Native | S | [U] |
| 22 | **Balance-sheet history** | Debt, equity, cash over time + debt/equity ratio line | `periods: {period, debt: Money, equity: Money, cash: Money}[]` | Cursor | Table; ratio in words | Native (compose NetWorthChart/ColumnChart) | S | SWS Debt to Equity History [V] |
| 23 | **Ownership breakdown** | Owner-type shares | existing `ShareDonut`/`ShareBar` | — | existing | Docs recipe only | S | SWS [V] |
| 24 | **Lightweight Charts adapter** | Full interactive trading chart, live, pan/zoom, custom series | our `Candle` → LWC data; attribution kept | LWC native + shell cursor | Shell wraps canvas: hidden table, live region, summary | Adapter (optional peer `lightweight-charts`) | M | TradingView (licence: Apache-2.0 + attribution) |
| 25 | **KLineChart adapter** | Drawing tools and many indicators | same | KLineChart overlays | Shell wraps canvas | Adapter (optional peer `klinecharts`) | M | — |
| 26 | Economic / earnings calendar | Date-grouped events with consensus, actual, previous | rows; values decimal strings | table | it is a table | Native, built from DataTable (not a chart) | S | [U] |

### 5.3 Build waves (at most 6 charts each)

**Wave 1: Fundamentals that personal-finance users see first** (shared pieces: sequential score scale, flow layout)

1. ScoreRadar (S–M)
2. SankeyChart for income statement and budgets (L)
3. FairValueBar (S)
4. PriceTargetChart (M)
5. EarningsChart (M)
6. Balance-sheet history (S) — plus Ownership as a docs recipe on ShareDonut (no new component)

**Wave 2: Trading price-chart parity** (all extend CandlestickChart + chart-math)

1. Price modes incl. Heikin Ashi (M)
2. Scale modes: log / percent / indexed + compare overlay (M)
3. Event markers and reference levels (M)
4. Indicator panes RSI / MACD / Bollinger / VWAP (M)
5. VolumeProfile + ProfileRail (L; also closes a punji-web parity gap)
6. Grouped MarketHeatmap with drill-in (M)

**Wave 3: Portfolio analytics and macro**

1. FanChart (M)
2. DrawdownChart + RollingReturnsChart (M; reuses `drawdownOf` from PR #95)
3. RiskReturnScatter (M)
4. YieldCurveChart + term-structure variant (M)
5. StyleGrid (S)
6. SeasonalityChart (M; pairs with MonthGrid)

**Wave 4: Non-time-based charts** (pure transforms first, one shared brick/column renderer)

1. Renko (S transform + shared renderer)
2. Kagi (S)
3. Point & Figure (M: X/O columns)
4. Line Break (S)
5. Range bars (S)
6. Breadth lines A/D + % above MA (S)

**Wave 5: Derivatives and adapters**

1. OptionsPayoffChart (M)
2. VolatilitySmile + IV heat grid (S–M)
3. `@punji/ui/lightweight-charts` adapter (M; attribution on)
4. `@punji/ui/klinecharts` adapter (M)
5. Economic + earnings calendar (S; DataTable compositions)
6. (Optional) `@punji/ui/echarts` adapter only if a consumer asks; otherwise a Plotly 3D-surface docs recipe

Notes on sequencing: wave 2 items touch `CandlestickChart` in one place; give them to one builder or land the
mode/scale refactor first. All native charts should move CandlestickChart onto `ChartA11yShell` as part of wave 2 so
every chart shares one a11y path. Adapters should follow the table-adapter pattern (optional `peerDependencies` +
`peerDependenciesMeta.optional`, own subpath, `check-boundaries` keeps them out of the root export).

### 5.4 Open questions / unverified points to settle before building

- Whether SWS's "Revenue & Expenses Breakdown" is currently a Sankey (pages 403 to automated fetch). Does not change
  the plan: Sankey is justified by 10q10k and budgeting apps either way.
- Exact Finviz map encoding (help page has no text). Our grouped treemap does not depend on it.
- Recharts v3 `accessibilityLayer` default (not decisive; Recharts is not recommended for core).
- mplfinance licence wording before porting anything from it.
- Trade-mark status of "Snowflake" (SWS) and "Style Box" (Morningstar): avoid the names regardless.
