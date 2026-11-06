# parity-B: punji-web `src/me` + `src/pages` -> @punji/ui

Read-only audit of punji-web (src/me 261 files, src/pages 165 files, 427 incl tests) against punji-ui @ 60801cf.

## 0. Key finding: web already imports `@punji/ui/*`, but it is a tsconfig alias

`tsconfig.app.json` maps `@punji/ui` and ~150 subpaths to `src/components/kit/*` (the web kit; see scripts/punji-ui-alias.mjs). Screens in `me` and most `pages` already import by package name, so for them "equivalent" means: is the module already exported by punji-ui? Of 131 distinct `@punji/ui/<sub>` paths the screens import, **89 are NOT in punji-ui package.json exports yet** (kit-only: pending migration). Those are tagged "(kit-only)" below. Modules that ARE exported (swap = no-op): retry-note, card-link, summary-figure, states, meter, card, step-list, metric-tile, locked-note, format, drawer-screen, check-row, inline-state, info-tip, compact, button, overlay, fact-list, controls, status-pill, sparkline, link-table, key-stats, column-chart, breakdown, bars, table, popover, pagination, select, tabs, status-tag, floating-tooltip, list-filter, company-search, inline-confirm, command-palette, command-keys, chart-scale, avatar, drawer.

Kit-only modules the screens use (other agent audits them; listed so none is lost): action-notice, alert-distance/form/panel/row/summary/target, app-strip, app-tab-bar, bar-button/list/switch, breadth-bar, broker-badge/days/lookup, candle-chart, card-section, caveat-list, chart-strip, checklist, company-name, contrast-card, correlation-matrix, cta-band, danger-confirm, disclosure, diverging-rows, equity-chart, faq-section, feature-card, filter-menu, floor-gauge, flow-waterfall, forecast-note, group-change-list/counts/pill, headline-list, health-summary, histogram, inbox-list, landing-section, levels-math, link-row, locked-preview, logo, mark-toggle-list, market-mark(+detail), market-report, market-strip, menu-list/panel, month-grid, month-strip, nav-icon, notification-bell, option-tile, period-history, person-tile, phase-strip, phone-menu, preset-tile, price-level-chart, principle-list, private-amount, product-shot, profile-rail, progress-row, prompt-card, quarter-bars, quote-hero, quote-list, range-editor, rating-change-row/chip/scale, reorder-list, return-bars, returns-heat-table, rotation-map, row-menu, rule-sentence, run-quota, sale-estimate, security-title, selectable-month-grid, setting-icon/row, site-footer/header, status-notice, step-field, store-buttons, story-stepper, symbol-block, tab-routes, target-chart, template-tabs, tms-address/anatomy, tool-menu, trend-chart, two-line-chart, watch-summary, watchlist-row, workspace-panel/toolbar.

## 1. Summary counts (per screen/pattern row below)

| verdict | rows |
|---|---|
| ui-better | 28 |
| ui-equal | 20 |
| partial | 54 |
| missing-generic | 15 |
| app-specific | 8 |
| **total rows** | 125 |

Rows group related files; roughly 150 screen files are covered by those rows (learn/* counted as one row; 37 articles).

## 2. Per-feature tables

### Portfolio (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Portfolio.tsx | Holdings desk: hero value + today line with live tween, hide-amounts eye | @punji/ui/portfolio-overview, /live-figure, /private-amount (kit-only) | ui-better | PortfolioOverview+holdingsSummary is decimal-exact; web hero sums Number |
| me/pages/portfolio/DeskTable.tsx | Holdings grid: role=grid, sort chips, pagination, selected row, sparkline, weight bar, kbd nav | @punji/ui/holdings-table + table-core + pagination + sparkline | ui-better | Web hand-rolls role=grid/aria-sort/aria-rowcount; ui table-core ColumnDef has sort/totals/CSV |
| me/pages/portfolio/DeskTable.tsx | Row measured with getComputedStyle/Math.round to pin page height (anti layout shift) | virtual-table / none | missing-generic | "fixed rows per page" min-height helper for paged lists. S |
| me/pages/portfolio/DeskChart.tsx | Value-over-time SVG chart: scrubber (role=slider), invested line, compare vs NEPSE rebased %, period chips, morph | @punji/ui/performance-chart | partial | Missing: keyboard scrub with aria-valuetext, invested/cost reference line, rebased-to-% compare series, point morph on period change, downsample. toFixed(1) only for SVG path (fine) |
| me/pages/portfolio/deskChartMath.ts | Path builders, ticks, % change using Number().toFixed | @punji/ui/chart-math, chart-scale | ui-equal | Rounding for pct readout uses Number(pct.toFixed(2)); ui chart-math covers geometry |
| me/pages/portfolio/DeskOverview.tsx | Stat tiles (today, horizons 1D/1W/1M/1Y with MeterBar), skeletons | @punji/ui/metric-tile, meter, retry-note | ui-equal |  |
| me/pages/portfolio/HoldingCard.tsx | Per-holding detail card: StatGrid, RangeBar 52w, sparkline, CardLink | @punji/ui/key-stats, meter RangeBar, stat-grid | ui-equal |  |
| me/pages/portfolio/HoldingBuys.tsx | Lots list with edit/delete (InlineConfirm), DateField/NumberField | @punji/ui/transaction-history + inline-confirm + fields | partial | No lot/tax-lot editor with per-lot P&L; ui has TransactionHistory (read-only) |
| me/pages/portfolio/DeskForms.tsx | Add-buy / sell forms in DrawerScreen, fees Breakdown, CGT preview, CompanySearch, LTP chip | @punji/ui/order-ticket, nepse-fees, drawer-screen, breakdown, fields | ui-better | Fees via contracts/finance/fees use JS floats + round2; ui nepse-fees is the exact engine. Sell toneClass uses Math.round(v*100) |
| me/pages/portfolio/AddKinds.tsx | Add kinds picker (buy/bonus/rights/IPO/auction) + CorporateForm | @punji/ui/option-tile (kit-only), fields, corporate-action-timeline | partial | OptionTile pending; no generic "record corporate action" form (bonus/rights/split) -> missing-generic M |
| me/pages/portfolio/SaleReview.tsx | Sale review with matched FIFO lots, profit signed | @punji/ui/breakdown, drawer-screen, portfolio calc | partial | No FIFO lot-matching helper in ui calculations/position; add (M) |
| me/pages/portfolio/DeskTransactions.tsx | Transactions list with type filters, ShowMore, TxRow, skeleton | @punji/ui/transaction-history, show-more | ui-better | ui has filters + CSV; web caps at TX_CAP and has no export |
| me/pages/portfolio/MoneyCard.tsx | Allocation by sector: ShareBar/Donut/Legend, top-N fold | @punji/ui/portfolio-allocation, meter | ui-equal | sectorColor.ts hard-codes #0f6b4b etc. in CSS vars -> use SHARE_TONES |
| me/pages/portfolio/BottomCards.tsx | Cash-flow waterfall, dividends and tax cards (DataRows) | @punji/ui/flow-waterfall (kit-only), dividend-history, tax/tds-summary | partial | FlowWaterfall pending; tax card could use ui tax helpers (BS fiscal year) |
| me/pages/portfolio/PendingNotice.tsx | Pending actions notice list (ActionNotice rows) | @punji/ui/action-notice (kit-only), status-banner | partial | ActionNotice not yet in ui; StatusBanner is closest |
| me/pages/portfolio/SubjectSwitcher.tsx | Switch between you / family members | @punji/ui/controls SegmentedSwitch, person-tile (kit-only) | ui-equal |  |
| me/pages/portfolio/RowActions.tsx | Row overflow menu; span onClick stopPropagation wrapper | @punji/ui/menu + popover | ui-equal | a11y: wrapper span onClick is the only non-semantic click handler in scope; ui Menu handles it |
| me/pages/portfolio/Signed.tsx, wholeRupees.ts | Signed money with XIcon, whole-rupee gain | @punji/ui/money-display, price-change | ui-better | ui prints sign+tone without colour-only meaning, exact |
| me/pages/portfolio/useDeskKeys.ts | j/k/enter hotkeys with TYPING guard | @punji/ui/use-hotkeys | ui-better | TYPING typing-guard regex duplicated in 7 files |
| me/pages/portfolio/usePhone.ts, desk/useNarrow.ts, overview/useWide.ts | matchMedia hooks (3 copies) | @punji/ui/use-media-query + use-hydrated | ui-better | 15 files call matchMedia directly; SSR-safe hook exists |
| me/pages/portfolio/panelMath.ts | XIRR_MIN_DAYS, XIRR/returns | @punji/ui/invest (xirr) + calculations | partial | Check parity of xirr; ui xirr exists |
| me/pages/portfolio/valueFill.ts | localStorage mode persistence, carry-forward fills | @punji/ui/use-storage | ui-better |  |
| me/desk/Skeleton.tsx, skeletonState.ts | Skeleton system that mirrors row grid (Bar, Busy, DeskListSkeleton, Hero/Panel skeletons), count remembered in localStorage | @punji/ui/states Skeleton | partial | ui Skeleton is a primitive; no row-geometry skeleton or aria-busy+SR "Loading" pattern -> promote (M) |
| me/desk/DeskChrome.tsx | DeskTitleRow, PushView, Plus/More icons | @punji/ui/layout PageHeader, drawer-screen | partial | Title row with freshness+actions is in app-header showcase; icons inline SVG -> ui icon set missing-generic S |

### Watchlist (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Watchlist.tsx | Watchlist page: locked/empty, add flow (CompanySearch), drawer panels, kbd shortcuts | @punji/ui/watchlist + company-search + drawer | partial | ui Watchlist is a view; lacks add flow, reorder, hotkeys, lock state |
| me/pages/watchlist/WatchList.tsx | Row list: sort bar, filter chips, row menu, held chips, inline delete confirm | @punji/ui/watchlist-row (kit-only), row-menu (kit-only), list-filter | partial | Pending kit; ui Watchlist has sort only |
| me/pages/watchlist/WatchOverview.tsx | Summary tiles, breadth, waiting alerts, how-to StepList | @punji/ui/watch-summary (kit-only), step-list | partial |  |
| me/pages/watchlist/WatchDetail.tsx | Detail: headline figure, range bar, alert target, remove confirm | @punji/ui/summary-figure, meter, inline-confirm | ui-equal |  |
| me/pages/watchlist/WatchChart.tsx | Line chart with tone var, SegmentedControl periods; toFixed | @punji/ui/performance-chart | partial | Third copy of scrub chart (DeskChart, WatchChart, compare/PerfChart, TrendChart) -> unify |
| me/pages/watchlist/WatchReorder.tsx | Reorder mode up/down list | @punji/ui/reorder-list (kit-only), stable-order | partial | Keyboard-operable reorder; ui has StableOrder hook only |
| me/pages/watchlist/wlLogic.ts | Sort/filter/summarise with Number(pct.toFixed(2)) | @punji/ui/stock-table sort, price-change | ui-better | Pct rounding via toFixed -> price-change handles |
| me/pages/watchlist/icons.tsx | Bell/Star/Close/Plus/Order inline SVG | (none) | missing-generic | Generic icon set (S/M); also pages/chart/icons.tsx, stock/icons.tsx, Home.tsx, DeskChrome: 5 icon files |

### Alerts (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Alerts.tsx | Alerts desk: tabs (active/fired), sort, drawer detail/form, hotkeys, locked/off states | @punji/ui/alert-* (kit-only), drawer | missing-generic | No alert UI in punji-ui; promote alert-row/summary/form/panel/target/distance as set (L) |
| me/pages/alerts/AlertForm.tsx | Alert form: symbol, direction, target NumberField, repeats, quick steps (+1%/+5%) | @punji/ui/alert-form (kit-only), fields, percentage-input | missing-generic | quick-step buttons "%away" helper: pure fn in alertDistance.ts |
| me/pages/alerts/AlertList.tsx | List with live LTP, distance-to-target, row menu, skeleton | @punji/ui/alert-row (kit-only), row-menu | missing-generic |  |
| me/pages/alerts/AlertDetail.tsx | Detail with firings log (ShowMore), fired-edit notice, InlineConfirm | @punji/ui/alert-summary (kit-only) | missing-generic |  |
| me/pages/alerts/AlertChart.tsx | Chart with target line | @punji/ui/target-chart (kit-only) | missing-generic |  |
| me/pages/alerts/AlertSuggest.tsx | Suggested alerts from 52w/avg | @punji/ui/alert-summary AlertCard | missing-generic |  |

### Overview / Home (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Home.tsx | Signed-in home: mode switch, phone actions, cards | @punji/ui/card, inline-state | partial | mobile-account-home showcase is banking, not investing |
| me/pages/overview/Hero.tsx | Hero: ChangeChip, TileRs, ValueChart (TrendChart), family tiles (PersonTile) | @punji/ui/portfolio-overview, summary-figure, sparkline | partial | trend-chart + person-tile kit-only |
| me/pages/overview/Lists.tsx | Holdings today, watch card, movers, sector card (DivergingBar, LinkTable) | @punji/ui/market-movers, link-table, bars | ui-equal |  |
| me/pages/overview/Attention.tsx | "Needs attention" feed: alerts reached, events ahead, staff mark, ProgressRow | @punji/ui/progress-row (kit-only), inline-state, status-banner | partial |  |
| me/pages/overview/NepseToday.tsx | Index card: RangeBar, TrendChart, SplitBar, MetricRow | @punji/ui/market-indices, market-breadth, meter | ui-equal |  |
| me/pages/overview/SetupGuide.tsx | Onboarding checklist with progress pill | @punji/ui/checklist (kit-only), onboarding-wizard | partial | dismissal in localStorage (useGuideHidden) -> use-storage |

### Stock page (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Stock.tsx + stock/Header.tsx | Stock header: price live tween, status pill, links | @punji/ui/quote-hero (kit-only), live-figure, price-limit | partial | No generic QuoteHero in ui; stock-detail example |
| me/pages/stock/Card.tsx | Section Card with state (on/locked/unavailable/absent), PlaceholderRows, retry | @punji/ui/card + states + retry-note | partial | Per-capability gated-card pattern (state machine) -> promote GatedCard (S) |
| me/pages/stock/Financials.tsx | Quarterly profit bars, EPS bars, valuation vs sector median markers, TTM table; 15 inline style={{}} for height/left % | @punji/ui/column-chart, meter RangeBar, statement-table | partial | Negative bars + median tick on range: check ColumnChart negative support. Inline <table> in-page. Heights via Math.max(3, pct) |
| me/pages/stock/Flow.tsx | Net buy/sell bars by broker, buy/sell split, weekly top-5 mini columns | @punji/ui/bars NetBar/SplitBar (kit-only), column-chart | partial | 8 inline styles; weekly sparkcolumns -> ColumnChart small |
| me/pages/stock/Holdings.tsx | Position card, key stats, order book depth bars, ownership split | @punji/ui/order-book, depth-chart, key-stats | ui-better | ui DepthChart + OrderBook; web draws bars with <i> widths |
| me/pages/stock/Info.tsx | News list, stacked cash/bonus dividend bars, dividend book, 11 inline styles | @punji/ui/dividend-history, column-chart, corporate-action-timeline | ui-better | colour via color-mix inline; legend swatches --c var |
| me/pages/stock/Ratings.tsx | Technical rating card: semicircle arc gauge SVG, verdict, horizon switch, trend polyline, toFixed | @punji/ui/risk-meter, rating-scale (kit-only) | partial | Arc-gauge zones + polyline sparkline built in ratingLogic.ts (toFixed(2) path math). Generic ArcGauge missing (M) |
| me/pages/stock/Technical.tsx | Technical indicators + peers card | @punji/ui/fact-list, key-stats | ui-equal |  |
| me/pages/stock/Health.tsx | Fundamental health checks summary | @punji/ui/check-row, health-summary (kit-only) | partial |  |
| me/pages/stock/StockChartSlot.tsx | TradingView AdvancedChart (hex colours from theme) | @punji/ui/candlestick-chart | app-specific | Licensed TV library embed stays; theme hex bridge could read tokens |
| me/pages/stock/StockSkeleton.tsx | Page skeleton CardSkel | @punji/ui/states | partial | same as desk skeleton |

### Chart workspace (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/ChartWorkspace.tsx | Charting workspace: side panel tabs (watch/lists/stock/index/alerts/brokers), strip sheet on phone | @punji/ui/split-pane, tabs PanelTabs, workspace-panel (kit-only) | partial | WorkspacePanel/ToolbarButton/ToolMenu/SymbolBlock pending; unique app |
| me/pages/chart/WorkspaceChart.tsx | TradingView widget, layouts saved in localStorage, marks overlay | @punji/ui/candlestick-chart | app-specific | TradingView stays |
| me/pages/chart/Toolbar.tsx, tabs.tsx, marks.ts | Toolbar, layouts menu, mark toggles, 52w ranges, lists | @punji/ui/menu, workspace-toolbar (kit-only) | partial |  |
| me/pages/chart/SymbolSearch.tsx | Symbol search w/ key handling | @punji/ui/company-search | ui-equal |  |

### Fundamentals / Signals (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Fundamentals.tsx | Statement board, period/mode switch, first-run, peers, narrative | @punji/ui/statement-table, table-core, financial | partial | ui statement-table is ledger style; no 5-year trend + peer-median board. Board in components/fundamentals (other agent) |
| me/pages/Signals.tsx | Technical rating changes feed (Glyph, Disc, RatingChangeRow), distribution (DistributionBar), scope tabs | @punji/ui/meter DistributionBar, rating-change-row (kit-only), rating-chip (kit-only) | partial | Local Glyph/Disc wrap StatusDisc |

### Research tools (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Seasonality.tsx + seasonal/* | Month grid heat, return bars, period history, BS+AD months, tour | @punji/ui/month-grid (kit-only), return-bars (kit-only), calendar (BS) | partial | NE_BS month names duplicated in seasonal/months.ts; ui calendar has BS labels |
| me/pages/PriceLevels.tsx + levels/* | Support/resistance volume-profile chart + ProfileRail | @punji/ui/price-level-chart (kit-only), depth-chart | partial | fmtPct = n.toFixed(2) |
| me/pages/Backtest.tsx + backtest/* | Strategy setup, results, equity chart, trades DataTable, monthly strip, saved strategies, quota | @punji/ui/equity-chart (kit-only), table, run-quota (kit-only), rule-sentence (kit-only) | partial | format.ts: signed pct with toFixed + Number round; NE_MONTHS; 1377-line file with 15 inline components (State, Setup, Result, Trades, Months...) |
| me/pages/Screener.tsx + components/screener-me | Screener: FilterBar, presets (PresetTile), results table, share link, copy | @punji/ui/stock-table, range-slider, preset-tile (kit-only) | missing-generic | No FilterBar/filter-builder; screener-link encode/decode logic is generic (L) |
| me/pages/Sector.tsx | Sector view with its own <table> | @punji/ui/stock-table | ui-better |  |

### Dividends (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/dividends/Home.tsx | Dividend home: holdings starters, filter, ContrastCard, LinkRow list | @punji/ui/dividend-history | partial | ContrastCard/LinkRow pending |
| me/pages/dividends/Company.tsx | Company book: declarations, scenario, cash vs bonus | @punji/ui/dividend-history, corporate-action-timeline | ui-equal |  |
| me/pages/dividends/parts.tsx | Book tiles/chart (ColumnChart, TwoLineChart), declarations table, scenario switch (ContrastSwitchRow) | @punji/ui/column-chart, dividend-history | partial | Money class component Money; scenario math uses floats (bookLogic) -> ui calculations |

### Settings / Feedback / Auth / Shell (me)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| me/pages/Settings.tsx | Account, appearance (theme/lang), notifications, family, sessions list, data export, danger delete | @punji/ui/setting-row (kit-only), danger-confirm (kit-only), theme, avatar | partial | setting-row/icon/danger-confirm pending; theme exists |
| me/pages/settings/exportCsv.ts | CSV builder with formula-injection guard, BOM, Blob download | @punji/ui/export (toCsv, csvCell neutralisation), download | ui-better | ui csv + downloadText already handles OWASP injection; delete local copy |
| me/pages/settings/useDownloadCopy.ts | Download flow state | @punji/ui/download | ui-equal |  |
| me/pages/Feedback.tsx | Feedback form: kind chips, severity, TextArea, Switch | @punji/ui/fields (TextAreaField kit-only), switch, choice-group | partial | TextAreaField not in ui (S) |
| me/pages/Login.tsx | Login: full-screen split-flap price board + sign-in ticket; aria-hidden board | @punji/ui/market-board | app-specific | Branded art. SignInPanel (components/auth) sign-in: OTP -> @punji/ui/otp-input, secure-field |
| me/pages/Register.tsx, PortfolioAdd/Sell/Symbol.tsx | Thin route shells with PageHeader | @punji/ui/layout PageHeader | ui-equal |  |
| me/pages/shell/TopBar.tsx | Top bar: tabs, market mark + detail, bell, switches, account | @punji/ui/app-header showcase; app-tab-bar, bar-button, market-mark (kit-only) | partial | app-header showcase demonstrates; components pending |
| me/pages/shell/Sidebar.tsx + sidebarState.ts + useSections.ts | Collapsible, pinnable sidebar with groups, keyboard shortcuts | @punji/ui/financial AppShell (accounting) | partial | No investing-sidebar with pins, rail collapse, persisted prefs (L) |
| me/pages/shell/CommandMenu.tsx | Command palette (go-to, symbols, holdings) | @punji/ui/command-palette, command-keys | ui-equal |  |
| me/pages/shell/AccountMenu.tsx | Account popover menu | @punji/ui/menu, popover, avatar | ui-equal |  |
| me/pages/shell/inbox/* | Inbox popover: groups, rows, unread, filters | @punji/ui/inbox-list (kit-only), popover | missing-generic | No notification-centre in ui (M) |
| me/MeStatusNotice.tsx, me/shared.tsx | StatusNotice dismissible banner; ErrorState; CapabilityGate; PriceNote | @punji/ui/status-banner, status-notice (kit-only), retry-note | partial | Capability gate = app-specific; upstream-requests.md lists StatusNotice storage-key work |
| me/lib/privacy.tsx | Hide-amounts store + mask | @punji/ui/private-amount (kit-only) | partial | Promote with currency prop; used 40+ call sites via Amt |
| me/i18n/* | Own en/ne dictionary, glossary, Nepali formatter checks | @punji/ui/locale | partial | ui locale packs: namespaces + amounts-in-words; web has product copy -> stays; numeric digits transform should use ui |
| me/App.tsx | Router, ToastProvider, lazy sections | @punji/ui/overlay ToastProvider | ui-equal |  |

### Market data (public)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| pages/NepseToday.tsx | Market report: index rows, summary, movers, histogram, breadth bar, notice | @punji/ui/market-indices, market-movers, market-breadth, market-status; market-report (kit-only) | ui-better | ui MarketMovers/Indices exact; MoveHistogram+ReportCard pending. showcase: market-portal Overview |
| pages/MarketBreadth.tsx | Breadth lines/split bars + <table> | @punji/ui/market-breadth | ui-better | components/market/StatCharts Lines/SplitBars |
| pages/HeatMap.tsx | Squarified treemap SVG (two layouts wide/tall), sector chips, size/colour switch, click-delegation navigate on div, table fallback | @punji/ui/market-heatmap + treemap.ts | ui-better | ui MarketHeatmap has squarify; web needs tile hrefs for SEO and click handler on div lacks keyboard (tiles <a>? check data-s). Need dual-layout SSR variant |
| pages/Sectors.tsx | Sector tree (links, role=list), size bars, year bars, 7 toFixed | @punji/ui/market-heatmap, meter ShareBar | partial | Heat tiles are Links with aria-label; ui Heatmap needs href tiles + `k-heat` depth classes |
| pages/SectorDetail.tsx | Company tree, largest bars, year split, sortable table with aria-sort (CompanyTable), k-stats grid | @punji/ui/market-heatmap, stock-table, table-core, key-stats | partial | In-page sortable <table> with scroll region role=region tabIndex=0; ui StockTable is Quote-based; need ScrollRegion DataTable (M) |
| pages/SectorRotation.tsx + rotation/* | Rotation map (quadrants), correlation matrix, phase strip, diverging rows, group counts, change list, gated | @punji/ui/rotation-map, correlation-matrix, phase-strip (all kit-only) | missing-generic | No rotation/correlation viz in ui (L) |
| pages/Seasonality.tsx + seasonality/* | NEPSE month heat grid AD/BS + return bars + period history | @punji/ui/month-grid, return-bars (kit-only), calendar BS | missing-generic | BS month placement logic -> ui calendar; MonthGrid pending |
| pages/Stocks.tsx | Stocks list: ranked movers, sort Select, ListFilter, MiniSpark, SegmentedControl | @punji/ui/stock-table, market-movers, sparkline, list-filter | ui-better |  |
| pages/ListedCompanies.tsx | Directory with filter/sort/segmented, NavIcon | @punji/ui/stock-table, list-filter, pagination | ui-better |  |
| pages/StockDetail.tsx + stock/* | Public stock page: Terminal (price, key figures, MeterBar/RangeBar, order book, flow, news, charts, dividends record) | @punji/ui/stock-detail showcase; key-stats, order-book, depth-chart, candlestick-chart | ui-better | 3 toFixed in StockDetail, Terminal PriceCell. showcase: stock-detail, market-portal CompanyScreen |
| pages/stock/TerminalLive.tsx (617 lines) | Live flow/depth/news/watch panels with section state, NetBar/SplitBar, HeadlineList, LockedRow | @punji/ui/order-book, bars, locked-preview (kit-only) | partial | Per-section useSectionState + sign-in free gate = app-specific; generic LockedRow pending |
| pages/stock/StockCharts.tsx, DividendChart.tsx | Monthly candles; cash/bonus ColumnChart | @punji/ui/candlestick-chart, column-chart | ui-equal | MONTHS list duplicated |
| pages/stock/Record.tsx, StockDividends.tsx | Dividend ledger table (Cell/DataTable), month cards, DataListRow, Delta | @punji/ui/dividend-history, table-core | ui-better | DividendHistory handles BS fiscal year |
| pages/stock/StockActions.tsx | Add-to-watchlist / portfolio CTA, inline SVG | @punji/ui/button | app-specific | Deep link to app/me |
| pages/Dividends.tsx | Hub: per-year cols (stacked cash/bonus), year cards, top yields, ListFilter latest-declaration table, hard-coded #b9e885 swatch | @punji/ui/dividend-history, column-chart, table | partial | k-cols stacked columns hand-built; 19 inline styles; hex in JSX |
| pages/DividendYear.tsx | Year table w/ caption sr-only, role=region tabIndex=0 scroll, 14 inline styles | @punji/ui/table-core | partial | Same ScrollRegion table gap |
| pages/Forex.tsx | NRB rates RankTable, unit-trap callout, 6 toFixed(2) on buy/sell | @punji/ui/fx-rate, global-money, money | ui-better | Rates as floats; INR unit 100 per rupee math (pegPerRupee.toFixed) -> Money decimal |
| pages/GoldSilver.tsx | Bullion tola vs 10g trap, MiniSpark, 17 inline styles, GRAMS_PER_TOLA=11.6638 float | @punji/ui/money, nepal | missing-generic | No Nepal unit helpers (tola/lal/aana, per-10g conversion) in ui -> missing-generic S; floats * 100 toFixed(1) |
| pages/Floorsheet.tsx | Explainer + company picker form role=search, column anatomy table, SignInFree | @punji/ui/company-search; market-portal FloorsheetScreen | partial | Uses native <input>+<button> instead of CompanySearch; floorsheet table not in ui (no FloorsheetTable) -> M |
| pages/Screener.tsx (public) | Presets (aria-pressed), collapsible filters form, sortable table, show-all, RangeMark | @punji/ui/range-slider, stock-table, list-filter | partial | Same as me screener; market-portal ScreenerScreen demonstrates |
| pages/Compare.tsx + compare/* | Pair compare: Picker (SymbolField, swap), PerfChart rebased to 100, SideBySide table with groups/Delta/HiDot/RangeBar/SplitBar, Related/Popular/Recent pairs | @punji/ui/performance-chart, table-core groups, meter | partial | PerfChart: end-label collision spreading (spreadLabels), pointer+arrow scrub, HTML text not SVG text. No side-by-side compare table (missing-generic M). market-portal CompareScreen exists |
| pages/TechnicalRatings.tsx | Methodology, thresholds table, readings, track record <table>x2, SVG arcs x3 | @punji/ui/table, risk-meter | partial |  |
| pages/BulkIpo.tsx | IPO board: Open now/Coming tabs (m-tabs role=tablist), IssueCard with date timeline m-tl, countdown, DataError, Skeleton | @punji/ui/share-issues, issue-card, tabs, states | ui-better | ui IssueCard/IssueList handle dates exactly; BS dates? issue dates here AD only. showcase: ipo-check, apply-issue-form, wealth-dashboard IssuesScreen |
| pages/brokers/* | Broker leaderboard (LinkTable, NetBar, MeterBar, ColumnChart), broker detail trading/companies, windows, Pagination, gated | @punji/ui/link-table, bars, meter, column-chart, pagination, retry-note | ui-equal | BrokerBadge/BrokerLookup/TmsAddress/TmsAnatomy kit-only, domain-specific (app-specific) |
| pages/Brokers.tsx, BrokerDetail.tsx | Directory with ListFilter, TMS anatomy, FAQ, StepList | @punji/ui/list-filter, step-list; faq-section | partial |  |

### Calculators / tools (public)

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| pages/Calculators.tsx | Tabbed (Sell/Buy/Break-even) ledger sheet, rates tables with active band shaded (aria-current), role=tablist hand-built, aria-live lines, hidden panels SSR | @punji/ui/nepse-fees, calculations, tabs, bill-summary | ui-better | Math in lib/sellMath + contracts/finance/fees via JS floats and round2; pct = round2(x*100000)/1000. ui nepse-fees is the exact path. Custom tablist should be ui Tabs |
| pages/home/SellSheet.tsx, HomeSale.tsx, sale.ts, cgt.ts, AnyCompany.tsx | Homepage sale calculator: CompanySearch, Select, windows, CGT schedule by date, Devanagari digits | @punji/ui/nepse-fees, tax, company-search, select, locale | ui-better | cgt rate toFixed(cgtRateDecimals); sale amounts float. Date-split CGT schedules (FY 2083/84) -> ui tax |
| pages/VirtualTrading.tsx | Paper-trade explainer with OrderTicket-like CostLedger; paperGain=(SELL-PRICE)*QTY | @punji/ui/order-ticket, nepse-fees, bill-summary | ui-better | pctOf via toFixed(2); commissionRate*100 toFixed |
| pages/PortfolioTracker.tsx | Product page with DataTable demo, CostLedger, StoryStepper | @punji/ui/holdings-table; portfolio-tracker showcase | ui-better |  |
| components/market/CostLedger (used by VirtualTrading, PortfolioTracker) | Itemised fee ledger (label/note/value, total) | @punji/ui/bill-summary, breakdown | ui-better |  |
| pages/home/bits.tsx | ScrollTable, HDelta, TimeRail, Chapter, LangSwitch | @punji/ui/table; delta in price-change | partial | LangSwitch EN/NE toggle -> generic LanguageSwitch (S) |
| pages/Invite.tsx | Referral code display with check alphabet, copy button, store CTA | @punji/ui/use-clipboard, code-block | ui-better | navigator.clipboard?.writeText raw; ui hook covers fallback |

### Landing / marketing

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| pages/Home.tsx | Landing: hero, AppStrip, market strip, StoryStepper, PrincipleList, ProductShot, link rows, FAQ, CtaBand | @punji/ui/landing-section etc (kit-only) | partial | Marketing blocks pending; site/src has landing pages? no equivalent showcase |
| pages/Features.tsx, HowItWorks.tsx, Pricing.tsx, About.tsx, Press.tsx, guide/index.tsx, learn/index.tsx | Product pages (Hero, Bento, Phones, Proof, Facts, Stats, Faq, Close via components/product), NavIcon, 8-10 inline styles | (none) | app-specific | Marketing composition; generic FaqSection/CtaBand/Stat rows -> promote only the primitives |
| pages/Plus.tsx | (parked) Plan cards, Ledger, FaqList, 19 inline styles | @punji/ui/card, accordion | app-specific | Not routed |
| pages/Changelog.tsx | Release list grouped by month, 10 inline styles | @punji/ui/corporate-action-timeline (loosely) | missing-generic | Changelog/Timeline list (S) |
| pages/NotFound.tsx | 404 with destination links | @punji/ui/states EmptyState | ui-equal |  |
| pages/Digest.tsx | Deep-link bounce with fallback timer + store buttons | (none) | app-specific |  |

### Learn / legal / support

| screen path | pattern | ui equivalent | verdict | note |
|---|---|---|---|---|
| pages/learn/* (37 files) | Article pages with Sources, Callout, KeyFacts, RoleCards, Timeline, StepFlow, RateShift, inline <table> x ~10, TOC | (components/learn/figures kit) | missing-generic | Article kit not in ui (M): Callout, KeyFacts, Timeline, StepFlow, RoleCards, Sources; tables -> ScrollRegion table |
| pages/learn/statements/Hub.tsx, Term.tsx | Financial-statement glossary: StatementTable, TermPanel/Sheet, TermChart, FaqList, ListFilter, matchMedia | @punji/ui/statement-table, accordion, sheet | partial |  |
| pages/Privacy.tsx, Terms.tsx, DeleteAccount.tsx, Support.tsx | LegalLayout long-form + FAQ mirrored to JSON-LD | (none) | app-specific | Static content; heading anchors/TOC (lib/toc.tsx) generic S |

## 3. Ranked gaps (`missing-generic` + `partial`)

Size: S under 1 day, M 1-3 days, L a week or more. "Kit-only" gaps (the 89 pending modules) are one task: migrate them; ranked below are the ones with new design work.

| # | gap | one-line spec | size | screens affected |
|---|---|---|---|---|
| 1 | Alert authoring set | AlertForm, AlertRow/List, AlertSummary, target + distance helpers (pure %-away math), TargetChart, quick-step buttons; exact decimals | L | me Alerts, Watchlist, Overview |
| 2 | Scroll-region DataTable (read-only, SSR) | `<table>` wrapper with focusable `role=region`, caption, sortable header buttons with `aria-sort`, `aria-current` row, sticky first col, numeric `r` alignment; built on table-core ColumnDef | M | 19 files: SectorDetail, DividendYear, Dividends, Calculators rates, Compare, learn/* |
| 3 | Scrubbable line chart (one chart, many uses) | PerformanceChart gains keyboard scrub (slider + aria-valuetext), rebased-to-100 / % compare, cost reference line, end-label collision spreading, period morph, downsample | M-L | DeskChart, WatchChart, compare/PerfChart, TrendChart, AlertChart, TargetChart |
| 4 | Filter builder / screener | FilterBar (range, sector multi-select, flags, presets as tiles), URL-serialised state, shareable link encode/decode, "drop best filter" empty-state helper | L | me Screener, public Screener |
| 5 | Row-geometry skeletons | Skeleton variants that reuse the real row grid, aria-busy + one SR "Loading", remembered row count, still under reduced motion | M | all me desks, Rotation, StockSkeleton |
| 6 | Investing app shell | Sidebar with groups, pins, collapse rail, persisted prefs, section capability gating, top bar slots (market mark, bell, switches), hotkeys | L | me shell/* (Sidebar, TopBar, AccountMenu) |
| 7 | Notification centre | Popover + InboxList (groups, unread dot, filters, count badge, empty/loading/error) | M | shell/inbox |
| 8 | Watchlist full set | Row (live LTP, held chips, menu), summary tiles/breadth, keyboard reorder, add flow, lock state | M | me Watchlist |
| 9 | Treemap with link tiles + dual layout | MarketHeatmap tiles as `<a>` with aria-label, wide and tall layouts for SSR/no-JS, four heat depths, sector focus chips | M | HeatMap, Sectors, SectorDetail |
| 10 | Nepal units helpers | tola/10g/gram conversions, "unit trap" (per 100 INR) with exact decimals, NRB rate row | S | GoldSilver, Forex |
| 11 | Bilingual primitives | LanguageSwitch, Devanagari digit transform for any number, BS month names, reader-lang aware date helper, localStorage persistence | M | home/*, brokers/*, me/i18n, seasonal/months, backtest/format, Seasonality |
| 12 | Corporate-action form | Record bonus / rights / split with auto-adjusted cost basis + FIFO lot matching helper (sale review) | M | AddKinds, SaleReview, HoldingBuys |
| 13 | Arc gauge + rating chip/scale | Semicircle gauge with zones, verdict word, 5-step RatingScale, RatingChip, change rows | M | Ratings, Signals, TechnicalRatings |
| 14 | Rotation / correlation / returns-heat | RotationMap quadrants, CorrelationMatrix, ReturnsHeatTable, PhaseStrip, MonthGrid + ReturnBars | L | Rotation, Seasonality (public + me) |
| 15 | Settings list set | SettingRow/Icon/List, DangerConfirm (type-to-confirm), sessions list row, "download a copy" card using ui export | S-M | Settings |
| 16 | Article kit | Callout, KeyFacts, Timeline, StepFlow, RoleCards, RateShift, Sources, in-page TOC | M | 37 learn pages + Hub/Term |
| 17 | Side-by-side compare table | Grouped rows, higher/lower dot, range bar + split bar cells, per-pair deltas | M | Compare, market-portal CompareScreen |
| 18 | Floorsheet table | Trades table (time, buyer, seller, qty, rate, amount) virtualised, broker filter, export | M | Floorsheet, TerminalLive |
| 19 | Gated card/section state machine | Card with `on / locked / unavailable / absent` states, PlaceholderRows, retry; LockedRow/LockedTile sign-in teaser | S | stock/Card.tsx, TerminalLive, Rotation, Seasonality |
| 20 | Generic icon set | Bell, star, plus, close, more, eye, pulse etc. as `Icon` (5 duplicate icon files in web) | S | watchlist/icons, chart/icons, stock/icons, Home, DeskChrome |
| 21 | Promote private-amount | Hide-amounts store, `PrivateAmount`, `useMask` for in-sentence figures | S | 40+ call sites |
| 22 | Marketing primitives | FaqSection (a11y accordion, JSON-LD stays in web), CtaBand, LandingSection, StoryStepper, PrincipleList, ProductShot, StoreButtons, Logo | M | Home, PortfolioTracker, NepseToday, Seasonality, Rotation |
| 23 | Stacked / negative column chart | ColumnChart: stacked series (cash+bonus), negative bars, reference tick, per-column inspection | S | Dividends, Info, Financials, DividendChart |
| 24 | Fixed-rows paged list | Pin list height to N rows so the page does not jump | S | DeskTable, brokers |
| 25 | TextAreaField, OptionTile, StepField | Missing form primitives used by Feedback, AddKinds, Backtest | S | Feedback, AddKinds, Backtest |
| 26 | Changelog / release list | Grouped by month, kind tags | S | Changelog |

Top by value for the migration: 1, 2, 3, 4, 6, 8, 9, 5, 7, 11, 12, 16, 22, 14, 13.

## 4. Inline one-off components worth promoting

| where | what | promote as |
|---|---|---|
| me/desk/Skeleton.tsx | Bar, Busy, DeskListSkeleton, HeroSkeleton, PanelSkeleton, vary() | RowSkeleton + Busy (gap 5) |
| me/pages/portfolio/DeskChart.tsx | scrub chart with invested line and compare | PerformanceChart modes (gap 3) |
| pages/compare/PerfChart.tsx | rebased chart, spreadLabels, HTML axis text | PerformanceChart `rebased` + `endLabels` |
| me/pages/watchlist/WatchChart.tsx | tone-var line chart | same |
| me/pages/portfolio/DeskTable.tsx | grid with sort, selection, kbd nav, weight bar | HoldingsTable options |
| pages/SectorDetail.tsx CompanyTable | sortable table with aria-sort and scroll region | ScrollRegion DataTable (gap 2) |
| pages/Sectors.tsx / SectorDetail.tsx SizeBars, YearBars, LargestBars, YearSplit | track bars with share + crore | ShareBar rows (meter) |
| pages/HeatMap.tsx Treemap + Layout | dual layout treemap | MarketHeatmap (gap 9) |
| pages/Calculators.tsx tablist, Field, rates tables | hand-built tabs + labelled field | ui Tabs + Field |
| pages/BulkIpo.tsx Board + IssueCard `m-tl` | issue timeline, tabs | ui share-issues |
| me/pages/stock/Ratings.tsx ARCS, Verdict, HorizonSwitch | arc gauge | ArcGauge (gap 13) |
| me/pages/stock/Flow.tsx NetList, Kv | net-by-broker diverging list | DivergingRows |
| me/pages/stock/Financials.tsx ProfitBars, EpsBars, ValRow | bars and median tick | ColumnChart + RangeBar marks |
| me/pages/Backtest.tsx State, Setup, SettingField, Trades, Months, Strategies, SaveStrategy, Trust | run-state card, parameter form, trades table | Backtest kit (equity-chart, rule-sentence, run-quota) |
| me/pages/Signals.tsx Glyph, Disc | StatusDisc wrapper | already StatusDisc |
| me/pages/Login.tsx Board | split-flap price board | app-specific, maybe PriceBoard demo |
| pages/home/bits.tsx ScrollTable, TimeRail, Chapter, LangSwitch | table scroller, timeline rail, language switch | gaps 2, 11, 26 |
| pages/compare/bits.tsx Delta, HiDot, RangeBar, SplitBar | second copies of kit Delta/RangeBar/SplitBar | use ui |
| pages/Dividends.tsx Sym, k-cols | symbol link, stacked columns | LinkTable StockLabel, gap 23 |
| me/pages/portfolio/Signed.tsx, Money.tsx, NoteParts.tsx | signed money, compact money | ui money-display / price-change |
| usePhone x3, useNarrow, useWide, useMedia, usePhone in Seasonality/Signals/Seasonality | matchMedia hooks (15 files) | use-media-query |
| TYPING const + keydown listeners | typing-guard hotkeys (10 files) | use-hotkeys |
| me/pages/settings/exportCsv.ts | csvCell, toCsv, saveCsv | ui export + download |
| pages/Invite.tsx | clipboard write | use-clipboard |
| me/lib/fundRecent.ts, compare/recent.ts, chart/prefs.ts, sidebarState.ts, useGuideHidden.ts | localStorage recents/prefs | use-storage |

## 5. Exactness and a11y risks

### Money / number exactness (JS Number, toFixed)
- `contracts/finance/fees` (called by DeskForms, sellMath, Calculators, VirtualTrading, home/sale, cgt): `round2(qty * sell)`, `gross * SEBON_FEE_RATE`, `computeCommission` on floats. Replace by `@punji/ui/nepse-fees` and `calculations` (decimal-exact). Tax, commission band edges and CGT rate on a float gain are the real risk.
- `pages/Calculators.tsx`: `pct = round2(x*100000)/1000` for rates; `breakEven` loops `Math.round(buy*10)..Math.round(buy*30)` ticks on floats (lib/sellMath.ts:52).
- `pages/VirtualTrading.tsx`: `paperGain = (SELL_PRICE - PRICE) * QTY`; `pctOf` = `(part/whole*100).toFixed(2)`; `commissionRate*100 .toFixed(2)`.
- `pages/GoldSilver.tsx`: `GRAMS_PER_TOLA = 11.6638` and `(1 - 10/11.6638)*100 .toFixed(1)`; `pages/Forex.tsx` 6x `buy.toFixed(2)`, `pegPerRupee.toFixed(2)` (INR is quoted per 100).
- `pages/Sectors.tsx`, `SectorDetail.tsx`: 14 `share.toFixed(1)` and `(cap/total*100).toFixed(1)` (display only, but `Math.round(c.cap)` into `fixed` for crore-scale rupees). Percentages of cap summed from floats may not reconcile to 100.0%.
- `me/pages/portfolio/DeskForms.tsx`: `Math.round(v*100) > 0` used to pick gain/loss tone (rounds a float; sign flips at the paisa edge); `calculateBuy(...)` float totals shown to the user.
- `me/pages/backtest/format.ts` (7), `watchlist/wlLogic.ts` (3), `seasonal/logic.ts`, `stock/stockLogic.ts` (`trimPct`), `stock/ratingLogic.ts` (9, incl. SVG path math, fine), `levels/logic.ts fmtPct`, `home/cgt.ts`: signed-percent formatters of the shape `Number(n.toFixed(dp))` then re-`toFixed`; replace with ui `price-change` / `format`.
- `me/pages/dividends/bookLogic` scenario math and `portfolio/panelMath` XIRR on Numbers; reconcile with ui `invest/xirr` and `calculations` before cut-over.
- `lib/format.ts` (web): `Number(n.toFixed(3))` and `Intl en-IN` grouping (lakh/crore). ui `format`/`money` keeps `en-IN` grouping; fine.
- Counts: `toFixed` in 42 files (about 100 call sites); 96 files contain Number()/parseFloat/`*100`/`/100`.

### Nepali / BS / lakh
- Lakh/crore grouping: lib/format.ts (`en-IN`), `croreFmt`, `compactRs`, `RS_PER_CRORE`; ui has the same convention, plus `amountInWords` in locale.
- Devanagari digits: pages/home/i18n.ts (`DEV`), me/i18n/*, brokers/liveText-ne, stock/*-ne.ts, backtest NE_MONTHS, seasonal/months.ts (`NE_BS`), levels/text, fundamentals/copy-ne. Five independent Nepali translation/digit paths; ui `locale` + `nepal` should own digits and month names.
- BS date usage: Seasonality (BS months placed from AD closes), StockDetail (`fyBs`), dividends by fiscal year (Shrawan to Asar), Calculators CGT break on `FY_START` / 2083/84 budget, GoldSilver (published BS date). ui `calendar` and `dividend-history`/`tax-invoice` already carry BS; no date picker in web uses BS. 35 files call `new Date(`; none use ui `date-picker`. DateField is the kit one.
- CGT schedule by date (`cgtScheduleFor`, `CGT_FY2083_84_START`) lives in contracts/finance; ui `tax` + `nepse-fees` should be the single source.

### Accessibility and tokens
- Overall strong: `aria-sort`, `aria-pressed`, `aria-live`, `role=alert/status` (20 files each), scroll regions `tabIndex=0 role=region`, SR-only captions, treemap tiles are real links with labels. Only one non-semantic click wrapper (portfolio/RowActions.tsx span stopPropagation).
- `pages/HeatMap.tsx`: container `onClick` delegates to `navigate()` via `closest('[data-s]')`; verify tiles are focusable (not links in SVG) or keyboard users cannot open a stock. ui MarketHeatmap tiles are buttons.
- Hand-built tablists in Calculators.tsx and BulkIpo.tsx (and `m-tabs`): arrow/home/end handling is custom; ui Tabs covers it.
- Hand-built `role="grid"` in DeskTable (no `aria-colindex`, manual focus management); ui HoldingsTable/table-core is tested.
- Outline suppression in CSS: kit-watch `.kit-wlr-open:focus-visible{outline:none}` (relies on a replacement style), kit-pop `.kit-pop:focus`, auth.css:31, nav.css:172. Check each has a visible alternative.
- Colour/hex outside tokens: `pages/Dividends.tsx:149` inline `#b9e885`; `styles/me-theme.css` (147 hex/rgba, deliberate theme), `base.css` 49, `kit.css` 45, `desk-panel.css` 28 (sector swatches `--desk-s-*` hard-coded hex), `board.css` 17 (Login), `kit.css:233` rgba hover. ~200 inline `style={{}}` across pages (Plus 19, Dividends 19, GoldSilver 17, DividendYear 14, Stock Financials 15, Info 11, Sectors 11, Changelog 10, ListedCompanies 10) mostly for width/left %, margins, `fontSize: 12.5`, `borderTop: 1px solid var(--sp-hair)` and `color-mix` in JSX. The percent-width ones are legitimate; margins/padding should be spacing tokens (`var(--space-5)` is used in places, raw 4/6/10/14/16 px elsewhere).
- Colour-only meaning: Login Board arrows are text glyphs (good); Sectors heat tiles carry text value (good); `Delta` always prints sign.
- Layout shift: desk row skeletons mirror loaded rows (good); recommend promoting rather than duplicating.

## 6. ui showcase/app pages that already demonstrate an equivalent
- `site/src/apps/market-portal` (Overview, CompanyScreen, CompareScreen, FloorsheetScreen, ScreenerScreen, CalendarsScreen, WatchlistScreen): public Market, Stock, Compare, Floorsheet, Screener, Watchlist screens.
- `site/src/apps/trading-terminal` (MarketWatch, SymbolScreen+Ticket, OrdersScreen, PositionsScreen, TradesScreen, Palette): Portfolio desk, order forms, command palette.
- `site/src/apps/wealth-dashboard` (Overview, HoldingsScreen, DividendsScreen, IssuesScreen, GoalsScreen, ActionsScreen): Portfolio overview, holdings + transactions + CSV, dividends by BS fiscal year, IPO issues.
- `site/src/apps/invest-insure`, `accounting`, `business`, `retail-banking`, `digital-wallet`: no web equivalent.
- Examples: `app-header`, `app-shell`, `app-band` (shell), `portfolio-tracker`, `holdings-table`, `transaction-history`, `portfolio-allocation`, `portfolio-overview`, `stock-detail`, `stock-table`, `market-board`, `market-heatmap`, `market-breadth`, `market-movers`, `market-indices`, `watchlist`, `watchlist-alerts`, `order-ticket`, `order-book`, `depth-chart`, `candlestick-chart`, `price-chart`, `ipo-check`, `issue-card`, `apply-issue-form`, `allotment-checker`, `dividend-history`, `dividend-tracker`, `csv-export`, `command-palette`, `data-freshness`, `status-banner`, `fx-rate`, `nepse-fees`, `tax-helpers`, `localisation`, `mobile-account-home`.
- No showcase for: alerts, screener filter builder, backtest, seasonality, sector rotation, technical ratings, learn articles, marketing landing, settings.

## 7. Method notes / limits
- Source of verdicts: file headers, import lines, grep of patterns across all 426 non-test files; large files (Backtest 1377, Signals 946, Portfolio 829, ChartWorkspace 876, TerminalLive 617) were read at the structure level, not line by line. Items marked "check" or "verify" need a one-off look before cut-over.
- Other agent covers `src/components/design/lib`; `components/{kit,ui,layout,product,fundamentals,market,...}` are only recorded as dependencies.
