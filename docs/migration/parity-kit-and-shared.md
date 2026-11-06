# punji-web → @punji/ui parity audit (part A: components, design, lib, hooks, data, config, analytics, CSS, deps)

Date: 2026-11-07. Read-only. punji-web at `f6df01a1` (2 uncommitted design-page edits, untouched). punji-ui at `feat/table-presets` (package.json `0.2.0`; npm latest `0.2.0`).
Scope: `punji-web/src/{components,design,lib,hooks,data,config,analytics,theme,styles}` + `package.json`. `src/me`, `src/pages`, `src/contracts` only consulted for usage.
Method: export lists of every web file; `diff -w` of the 56 kit modules that share a kebab name with a ui folder; ui source read for every claimed equivalent; token-name diff of `web/src/styles/{tokens,me-theme,tokens.generated,base}.css` vs `ui/src/styles/{tokens,contrast}.css`. Prior audit `docs/audit/punji-web-kit-diff.md` (same day) was used as a starting point and re-checked; where it is stale it is said below.

**Precondition found while auditing:** most of what makes ui "better" for web is **not released**. npm has `0.2.0`; these are pending changesets on main: `link-provider`, `menu`, `accordion`, `breadcrumb`, `status-banner`, `data-freshness`, `fx-rate`, `upstream-kit-gaps` (reader-language `rs/cr`, ColumnChart inspection, pagination guide), `colour-parity-tokens`, `token-scales`, `z-index-motion-contrast`, `overlay-a11y`, `overlay-layer`, `table-core`, `one-money-path`, `finance-convention`. Migration needs a `0.3.0` release first.

Important context: web's `src/components/kit/` **is** the ancestor of punji-ui. Web already imports it as `@punji/ui` through a local alias (`scripts/punji-ui-alias.mjs` → `src/components/kit`), so "migrate" for the kit means switching the alias to the npm package module by module.

---

## 1. Summary counts

Rows = one web module (file) or a tightly coupled group noted in the table. 226 rows.

| Verdict | Count | Meaning |
|---|---:|---|
| `ui-better` | 36 | replace; ui is a superset or more correct |
| `ui-equal` | 38 | replace; same behaviour |
| `partial` | 61 | ui has it but lacks a named prop/behaviour |
| `missing` (generic) | 35 | belongs in the library |
| `missing` (app) | 7 | nothing in ui, app-specific: stays in web |
| `web-only` | 49 | app glue/content/data/brand: intentionally not library |

(Counts are from the table below: `grep -c '| ui-better |'` etc.)

---

## 2. Table

Legend for ui column: `@punji/ui/<subpath>` exports. "rel" = needs the unreleased 0.3.0 changesets.

### 2.1 `src/components/kit/` matched modules (56; alias already calls them `@punji/ui/<name>`)

| web path | what it is | ui equivalent | verdict | gap / migration note |
|---|---|---|---|---|
| kit/Avatar.tsx | initials avatar | `@punji/ui/avatar` | ui-equal | diff is imports only |
| kit/Bars.tsx | SplitBar, DivergingBar, NetBar | `@punji/ui/bars` | ui-better | Props types, RTL (`insetInlineStart`), non-finite guards |
| kit/Breakdown.tsx | how a total is made | `@punji/ui/breakdown` | ui-better | Accepts `MoneyDisplay` for exact amounts |
| kit/Button.tsx | button/link button | `@punji/ui/button` | ui-better | `external`, `newTabLabel`, `stacked`, `iconOnly`, `linkComponent`/`LinkProvider` (rel). Risk: new-tab aria-label wording changes to "{name} (opens in a new tab)" |
| kit/Card.tsx | card | `@punji/ui/card` | ui-equal | `eyebrow`, `size="lg"`, `tone="inverse"` present |
| kit/CardLink.tsx | whole-card link | `@punji/ui/card-link` | ui-better | `NEW_TAB_PUNJI` copy stays in web, pass as `newTabLabel` |
| kit/CheckRow.tsx | status row list | `@punji/ui/check-row` | ui-better | Roving keys in tablist, `0` valid figure. **Classes renamed `kit-check*`→`kit-crow*`**: web CSS/tests must follow |
| kit/Checkbox.tsx | checkbox | `@punji/ui/checkbox` | ui-equal | |
| kit/ChoiceGroup.tsx | radio group | `@punji/ui/choice-group` | ui-equal | |
| kit/ColumnChart.tsx | column chart + ChartInspect | `@punji/ui/column-chart` | ui-better | (rel) built-in hover/keyboard inspection, `mirror`/`net`/`mirrorScaleTop`, null values, labels |
| kit/CommandPalette.tsx | ⌘K palette | `@punji/ui/command-palette` | ui-equal | Props types only |
| kit/CompanySearch.tsx | symbol finder | `@punji/ui/company-search` | ui-better | Shared `comboStep`; **`clearOnOpen` defaults true**: web finders that keep the query must pass `clearOnOpen={false}` |
| kit/Controls.tsx | Chip, ChipRow, SegmentedControl/Switch | `@punji/ui/controls` | ui-better | Types, i18n |
| kit/Drawer.tsx | side drawer | `@punji/ui/drawer` | ui-better | Focus/overlay fixes (rel `overlay-a11y`) |
| kit/DrawerScreen.tsx | drawer layout parts | `@punji/ui/drawer-screen` | ui-better | |
| kit/FactList.tsx | label/value facts | `@punji/ui/fact-list` | ui-equal | |
| kit/Fields.tsx | Field, NumberField, … | `@punji/ui/fields` | ui-better | `trailingAction`, south-asian grouping, Devanagari/Bengali digit input, steppers with hold-repeat, `onValueChange` parsed |
| kit/Figures.tsx | Figure, Delta | `@punji/ui/figures` | ui-better | (rel) rupee mark from `PunjiLocaleProvider`/`mark` prop instead of a module global |
| kit/FilterChip.tsx | filter chip | `@punji/ui/filter-chip` | ui-equal | |
| kit/FloatingTooltip.tsx | tooltip, IconHint | `@punji/ui/floating-tooltip` | ui-equal | |
| kit/InfoTip.tsx | info tip / tooltip | `@punji/ui/info-tip` | ui-better | |
| kit/InlineConfirm.tsx | inline confirm | `@punji/ui/inline-confirm` | ui-better | `role="alertdialog"`, `as`, `busy` |
| kit/InlineState.tsx | inline state glyph | `@punji/ui/inline-state` | ui-equal | |
| kit/KeyStats.tsx | key stats | `@punji/ui/key-stats` | ui-equal | |
| kit/Layout.tsx | PageLayout, PageHeader | `@punji/ui/layout` | ui-better | `headingLevel`, links via provider |
| kit/LinkTable.tsx | link table | `@punji/ui/link-table` | ui-better | linkComponent |
| kit/ListFilter.tsx | list filter | `@punji/ui/list-filter` | ui-equal | `name`, `selectOnFocus` closed upstream |
| kit/LiveFigure.tsx | tweened live figure | `@punji/ui/live-figure` | ui-better | |
| kit/LockedNote.tsx | paywall note | `@punji/ui/locked-note` | ui-equal | |
| kit/Meter.tsx | MeterBar, RangeBar, ShareBar/Donut… | `@punji/ui/meter` | ui-better | Guards, logical props, `ScaleStep` |
| kit/MetricTile.tsx | metric tile | `@punji/ui/metric-tile` | ui-equal | |
| kit/OrderBook.tsx | depth book | `@punji/ui/order-book` (`OrderBookDepth`) | ui-equal | Rename import `OrderBook`→`OrderBookDepth`, `OrderBookLabels`→`OrderBookDepthLabels` (1 site) |
| kit/Overlay.tsx | Sheet, Toast, Dock | `@punji/ui/overlay` | ui-better | (rel) Sheet focus/ids, Toast timing, layer |
| kit/Pagination.tsx | pager | `@punji/ui/pagination` + `use-pagination` | ui-better | **0-based→1-based**, `onPage`→`onPageChange`, `prevLabel`→`previousLabel`; `pageCount`→`paginate().pageCount`, `pageOf`→`pageOfIndex()-1` |
| kit/Popover.tsx | popover | `@punji/ui/popover` | ui-better | `portal`, `width`, visualViewport; focus timing differs (useLayoutEffect) |
| kit/RangeSlider.tsx | dual range | `@punji/ui/range-slider` | ui-equal | |
| kit/RetryNote.tsx | retry note | `@punji/ui/retry-note` | ui-equal | |
| kit/Rows.tsx | RowList, ValueRow, DataRows, Tile | `@punji/ui/rows` | ui-better | `bar`, `note` slots closed upstream |
| kit/Select.tsx | select | `@punji/ui/select` | ui-better | native-picker enhancement on touch |
| kit/ShowMore.tsx | show more | `@punji/ui/show-more` | ui-equal | |
| kit/Sparkline.tsx | sparkline | `@punji/ui/sparkline` | ui-better | `maxPoints`, min/max-preserving `reduceSeries`, nulls |
| kit/States.tsx | EmptyState, Note, Skeleton | `@punji/ui/states` | ui-better | `headingLevel` |
| kit/Stats.tsx | StatGrid/StatTile | `@punji/ui/stats` | ui-equal | |
| kit/StatusPill.tsx | pill, CountBadge | `@punji/ui/status-pill` | ui-better | `info` tone, links |
| kit/StatusTag.tsx | status tag | `@punji/ui/status-tag` | ui-equal | |
| kit/StepList.tsx | numbered steps | `@punji/ui/step-list` | ui-better | `Step` type |
| kit/SummaryFigure.tsx | headline figure | `@punji/ui/summary-figure` | ui-equal | |
| kit/Switch.tsx | switch | `@punji/ui/switch` | ui-equal | |
| kit/Table.tsx | DataTable | `@punji/ui/table` (+`table-core`, `virtual-table`) | ui-better | search, pagination, selection, row groups, totals that reconcile (rel `table-core`). CSS differs (`kit-table-tools`) |
| kit/Tabs.tsx | tabs | `@punji/ui/tabs` | ui-equal | |
| kit/chartScale.ts | bracket/value scale | `@punji/ui/chart-scale` | ui-equal | identical source |
| kit/comboStep.ts | combobox reducer | `@punji/ui/combo-step` | ui-equal | identical |
| kit/commandKeys.ts | key helpers | `@punji/ui/command-keys` | ui-equal | identical |
| kit/compact.ts | Rs L/Cr/Arba | `@punji/ui/compact` | ui-equal | pass `unitWords(lang)`, `rsMark(lang)` explicitly |
| kit/format.ts | formatFigure, toneOf, parseNumber, searchSymbols | `@punji/ui/format` | ui-better | `parseNumber` takes every digit script; (rel) `rs(n, lang)`, `cr`, `setReaderLang` shim |
| kit/live.ts | tween helpers | `@punji/ui/live` | ui-equal | |

### 2.2 `src/components/kit/` modules with no same-named ui module (111)

| web path | what it is | ui equivalent | verdict | gap / migration note |
|---|---|---|---|---|
| kit/ActionNotice.tsx | pending answers card (rows with actions) | `status-banner` is service-level only | missing | generic, S |
| kit/AlertRow.tsx | price alert row (full/compact/skeleton/empty) | none | missing | generic (price-alert family), M |
| kit/AlertSummary.tsx | alerts summary card | none | missing | generic with AlertRow, S |
| kit/alertDistance.ts, alertTarget.ts | distance-to-target math | none (`price-limit` is circuit only) | missing | generic, S; pure functions |
| kit/AlertForm.tsx, AlertPanel.tsx | alert editor composition | composes CompanySearch/Fields | missing | app (stays in web on ui primitives) |
| kit/AppStrip.tsx | mobile-app marketing band | — | web-only | marketing |
| kit/AppTabBar.tsx | phone bottom tab bar + More sheet | `financial` AppShell has no bottom bar | missing | generic `BottomTabBar` shell, M; Punji tabs/routes stay in web |
| kit/BarButton.tsx | app-bar icon button, BarSearch, BarAnchor | `button` (`iconOnly`) | partial | no 40px/44px-phone bar size; BarSearch (search trigger with ⌘K hint) missing |
| kit/BarList.tsx | ranked values with proportional bars | `breakdown`, `meter` MeterBar | partial | no ranked bar-list (label, exact value, bar, optional action) — S |
| kit/BarSwitch.tsx | 40px app-frame switch (Dark/Light, EN/ने) | `controls` SegmentedSwitch | partial | bar size variant only |
| kit/BreadthBar.tsx | rose/held/fell bar | `@punji/ui/market-breadth` | ui-better | ratio, convention, labels, loading |
| kit/BrokerBadge.tsx | NEPSE broker number tile | none | missing | generic (NEPSE), S |
| kit/BrokerDays.tsx | bought/sold per session columns | `column-chart` `mirror` (rel) | partial | tap-anywhere column tiling and per-party labels |
| kit/BrokerLookup.tsx | broker find by number/name | none | missing | app (broker data + TMS links) |
| kit/CandleChart.tsx | OHLC + volume | `@punji/ui/candlestick-chart` | ui-better | MAs, time axis, data-table fallback, `convention`, `validateOhlc` |
| kit/CardSection.tsx | flush-card section + row | `card` (`flush`) | missing | generic, S (`CardSection`, `CardSectionRow`) |
| kit/CaveatList.tsx | "before you trust this" notes on inverse | `states` Note | partial | list-of-notes on inverse, S |
| kit/ChartStrip.tsx | phone bottom bar for a full-frame tool | — | missing | app (chart workspace) |
| kit/Checklist.tsx | getting-started checklist + ProgressPill | `onboarding-wizard` is a wizard | missing | generic, S |
| kit/ContrastCard.tsx | inverse "your position" card | `card` `tone="inverse"` + `summary-figure` | partial | `ContrastRows`/`ContrastSwitchRow` layout; S |
| kit/CorrelationMatrix.tsx | pairwise correlation heat table | none | missing | generic chart, M |
| kit/CtaBand.tsx | closing marketing band | — | web-only | marketing |
| kit/DangerConfirm.tsx | caution/danger confirm, typed `match` | `inline-confirm`, `dialog` AlertDialog (`destructive`) | partial | **no typed confirmation (`match`/`confirmMatches`)** and no caution vs danger strength; S |
| kit/Disclosure.tsx | one show/hide row, DisclosureList | `@punji/ui/accordion` (rel) | ui-equal | controlled `value`/`onValueChange`; `current` highlight not present (cosmetic) |
| kit/DivergingRows.tsx | signed rows from centre line | `bars` DivergingBar | partial | row-list wrapper with labels/values, S |
| kit/EquityChart.tsx | value over time + benchmark + contributions + drawdown band | `@punji/ui/performance-chart` | partial | **no drawdown band, no dotted "money put in" series, no `EquityLegend`**; M |
| kit/FaqSection.tsx | FAQ two-column section | `accordion` (rel) | partial | closed answers stay in DOM (ok); FAQPage JSON-LD + two-column marketing frame stay web |
| kit/FeatureCard.tsx | marketing feature grid | — | web-only | marketing |
| kit/FilterMenu.tsx | grouped "+ Add filter" list | `@punji/ui/menu` MenuButton (rel) | partial | no groups-in-columns, group `note` explaining disabled items, `aside` count; S |
| kit/FloorGauge.tsx | half-ring gauge with floor tick | `risk-meter` (different) | missing | generic, S |
| kit/FlowWaterfall.tsx | waterfall steps to a total | none | missing | generic chart, M |
| kit/ForecastNote.tsx | "past results not a forecast" line | `states` Note | ui-equal | copy stays in web |
| kit/GroupChangeList.tsx, GroupCounts.tsx, GroupPill.tsx, PhaseStrip.tsx | sector-rotation groups | `status-pill` for pill | web-only | rotation domain |
| kit/HeadlineList.tsx | news headlines (source · time) | none | missing | generic, S |
| kit/HealthSummary.tsx | "3 of 4 checks pass" segmented bar | `check-row` + `meter` | partial | segmented-by-tone bar + count line; S |
| kit/Histogram.tsx | bucket counts with kept-range highlight | none | missing | generic chart, M |
| kit/InboxList.tsx | notifications list (groups, rows, skeleton) | none | missing | generic, M |
| kit/LandingSection.tsx | LandingHero, PointGrid, LandingIcon | — | web-only | marketing |
| kit/LinkRow.tsx | whole-row link with symbol/pill/line | `link-table`, `card-link` | partial | list-row variant (not table), S |
| kit/LockedCell.tsx | locked DataTable column head/cell | `locked-note` | missing | generic (entitlement), S |
| kit/LockedPreview.tsx | blurred example rows + lock | `locked-note` | missing | generic, S |
| kit/Logo.tsx, LogoWordmark.tsx | Punji brand | — | web-only | brand |
| kit/MarkToggleList.tsx | chart series toggles with swatches | none (`ColumnLegend` static) | missing | generic, S |
| kit/MarketMark.tsx | session dot + index value/change | `@punji/ui/market-status` | partial | **no `offline` state** (MarketState lacks it); index value/change inline not part of MarketStatus |
| kit/MarketMarkDetail.tsx | session sentence ("Closed for Dashain · opens Wed 21 Oct") | `market-status` `detail`, `getMarketSession`, `nepseSchedule` | partial | sentence builder from schedule; S |
| kit/MarketReport.tsx | IndexSummary, MoveHistogram, MoverList, IndexRows, MarketNotice | `market-movers`, `market-indices` | partial | MoveHistogram missing (see Histogram); IndexSummary layout |
| kit/MarketStrip.tsx | last session on one band | `market-indices`, `market-breadth` | partial | strip layout + cells; S |
| kit/MenuList.tsx | role=menu items (router link, href, action, danger, busy) | `@punji/ui/menu` (rel) | partial | no `MenuHead`, item `hint`, `next` ›, `busy`, `lang`; menu is bound to MenuButton (no standalone list) |
| kit/MenuPanel.tsx | site-bar mega panel | — | web-only | site nav |
| kit/MonthGrid.tsx, SelectableMonthGrid.tsx | year×month returns grid | none (`calendar` is a date picker) | missing | generic heat table, M (with ReturnsHeatTable) |
| kit/MonthStrip.tsx | months tinted by sign | none | missing | generic, S |
| kit/NavIcon.tsx | nav glyph set | none (no icon set in ui) | missing | generic icon set, M (see ranked gaps) |
| kit/NotificationBell.tsx | bell + unread badge (99+) | `status-pill` CountBadge, `button` iconOnly | partial | bell button + `badgeText` cap; S |
| kit/OptionTile.tsx | large choice tile list | `choice-group` | partial | icon + title + line tile variant, act-on-click mode; S |
| kit/PeriodHistory.tsx | one period across years, diverging | `bars` DivergingBar | partial | same as DivergingRows |
| kit/PersonTile.tsx | person/account tile with 30-day line | `metric-tile` + `sparkline` | partial | composition; S |
| kit/PhoneMenu.tsx | phone site menu | — | web-only | site nav |
| kit/PresetTile.tsx | saved filter preset tile with live count | none | missing | generic (screener), S |
| kit/PriceLevelChart.tsx, ProfileRail.tsx | volume at price per session + profile | none | missing | generic chart, L |
| kit/PrincipleList.tsx | marketing principles | — | web-only | marketing |
| kit/PrivateAmount.tsx | hide-amounts store + mask + toggle | none (`MoneyDisplay` has no mask) | missing | generic, S–M (high value for a finance kit) |
| kit/ProductShot.tsx | framed screenshot | — | web-only | marketing |
| kit/ProgressRow.tsx | target progress row + badge | `meter` MeterBar | partial | title/distance/badge row; S |
| kit/PromptCard.tsx | empty-page prompt + OutlineTile | `states` EmptyState | partial | eyebrow + large headline variant, dashed outline tile; S |
| kit/QuarterBars.tsx | figure across periods, chosen highlighted | `column-chart` | partial | `lit` exists (rel); dashed missing-period bar and fade-later styling missing |
| kit/QuoteHero.tsx, SymbolBlock.tsx, SecurityTitle.tsx | instrument header (symbol, name, price, change) | `price-change` | missing | generic `InstrumentHeader`, S |
| kit/QuoteList.tsx | quotes from a source doc | — | web-only | fundamentals content |
| kit/RangeEditor.tsx | FilterPopover + range editor | `range-slider`, `popover` | missing | generic (range filter with histogram, presets), M |
| kit/RatingChangeRow.tsx | rating moves list | `check-row` StatusDisc | missing | generic with RatingScale, S |
| kit/RatingChip.tsx, RatingScale.tsx | five-step scale chip/segments | `risk-meter` (risk levels only) | partial | generic N-step scale with `from` step; S |
| kit/ReorderList.tsx | drag + keyboard reorder | `watchlist` (`onReorder`, `moveItem`) | partial | no generic reorderable list; M |
| kit/ReturnBars.tsx | signed bars per period, extremes labelled | `column-chart` (`net`) | partial | extremes-only labels; inspection via ChartInspect |
| kit/ReturnsHeatTable.tsx | subject × period heat table | none | missing | generic, M (with MonthGrid) |
| kit/RotationMap.tsx | RS-ratio/momentum quadrant scatter | none | missing | app (a generic quadrant scatter would be L) |
| kit/RowMenu.tsx | row ⋯ menu (popover wide / sheet on phone) | `@punji/ui/menu` MenuButton (rel) | partial | **no phone bottom-Sheet mode under 768px**, no controlled `open`; danger tone + href ok |
| kit/RuleSentence.tsx | controls described as a sentence | — | web-only | copy templating |
| kit/RunQuota.tsx | runs-left pill | — | missing | app |
| kit/SaleEstimate.tsx | "what would a sale leave you" card | `nepse-fees` `estimateNepseTrade`, `breakdown` | partial | layout + choices; fee math must stay on web contracts (see risks) |
| kit/SettingIcon.tsx | settings glyphs | none | missing | part of icon-set gap |
| kit/SettingRow.tsx | settings row (disc/lead, title, line, trail) | `rows` ValueRow | partial | settings-list row with trailing control; S |
| kit/SiteFooter.tsx, SiteHeader.tsx | public site chrome | — | web-only | site chrome |
| kit/StatusNotice.tsx | dismissible service strip | `@punji/ui/status-banner` (rel) | ui-better | controlled `open`/`onOpenChange` = SSR-safe; web persists dismissal with `useSessionStorage` |
| kit/StepField.tsx | setting cell with −/+ | `fields` NumberField `steppers` | partial | cell layout (label over value, hairlines); S |
| kit/StoreButtons.tsx | App/Play badges | — | web-only | brand artwork (duplicate of `components/StoreButtons.tsx`) |
| kit/StoryStepper.tsx | marketing story stepper | — | web-only | marketing |
| kit/TargetChart.tsx | price line + dashed target | `performance-chart`, `sparkline` | partial | **no reference/target line** on ui charts; S |
| kit/TemplateTabs.tsx | rule tabs, some locked | `controls` SegmentedControl / `tabs` | partial | locked-option state; S |
| kit/TmsAddress.tsx, TmsAnatomy.tsx | broker TMS address | — | missing | app (NEPSE TMS explainer) |
| kit/ToolMenu.tsx | toolbar layer (title/item/note) | `popover` (`fullScreenPhone`) | partial | composition parts; S |
| kit/TrendChart.tsx | small line + fill + dashed 2nd + 3 levels | `performance-chart` (`area`) | partial | quiet 3-level axis + first/last dates only; S |
| kit/TwoLineChart.tsx | two series, end values under key | `performance-chart` | partial | end-value legend; dashed second series |
| kit/WatchSummary.tsx | watched-list summary | `market-breadth`, `metric-tile` | partial | composition |
| kit/WatchlistRow.tsx | watchlist row (4 figures, actions, skeleton) | `@punji/ui/watchlist` | partial | ui row not exported standalone; no "since added"/month columns, no row skeleton, no actions slot beyond remove |
| kit/WorkspacePanel.tsx, WorkspaceToolbar.tsx | chart workspace chrome | `tabs` PanelTabs | missing | app |
| kit/companyName.ts | `displayCompanyName` (NEPSE casing, acronyms) | `format` shortCompanyName only | missing | generic (NEPSE), S |
| kit/levelsMath.ts | barShare/splitShares | — | web-only | helpers for PriceLevelChart |
| kit/tabRoutes.ts | tab routes, cookies | — | web-only | routing |
| kit/index.ts | barrel | `@punji/ui` | web-only | delete with alias |

### 2.3 `src/components/` (root, auth, charts, data, dividends, fundamentals, gate, layout, learn, market, product, screener-me, statements, stocks, ui)

| web path | what it is | ui equivalent | verdict | gap / migration note |
|---|---|---|---|---|
| Breadcrumb.tsx | breadcrumb + BreadcrumbList JSON-LD | `@punji/ui/breadcrumb` (rel) | partial | ui lacks JSON-LD and `hidden` indices (has `maxItems` collapse). JSON-LD can stay in web |
| GuideArticlePage.tsx, GuidePage.tsx, LearnLayout.tsx, LegalLayout.tsx | content page layouts (Tailwind) | — | web-only | |
| InstallBar.tsx | PWA/app install bar | — | web-only | |
| ScrollToTop.tsx | router scroll reset | — | web-only | |
| Seo.tsx | head tags | — | web-only | |
| StoreButtons.tsx | duplicate of kit/StoreButtons | — | web-only | dedupe in web |
| auth/* (SignInHost, SignInPanel, SignInSheet, Turnstile, authText, signInRequest) | sign-in flow | `otp-input` can replace code entry | web-only | auth; consider ui `OtpInput` inside SignInPanel |
| charts/BarsSvg.tsx | static SVG bars | `column-chart` | partial | server-only render with zero JS (ui is `use client` but renders SVG on SSR) |
| charts/ChartInspect.tsx, inspection.ts | reusable hover/keyboard inspection layer | built into ColumnChart/Candlestick/Performance (rel) | missing | generic: **no standalone inspection layer** for custom SVG charts (LineSvg, StatCharts, meters, PillarPanel); M |
| charts/LineSvg.tsx | line/area + comparison + Sparkline | `performance-chart`, `sparkline` | partial | period-change tone colouring; zero-JS SSR intent |
| charts/MarkTooltip.tsx | chart mark tooltip | `floating-tooltip` | ui-equal | |
| charts/UPlotChart.tsx | uPlot interactive layer | — | web-only | **dead code: no importer**; delete with `uplot` dep |
| charts/geometry.ts | domain, paths, downsample, tone | `chart-math` (`niceTicks`, `downsampleIndices`, `rebase`…) | partial | linePath/areaPath helpers not public |
| charts/tv/* (AdvancedChart, datafeed, feeds, layoutStore, library, theme, types) | TradingView Advanced Charts | — | web-only | licensed lib, runtime-loaded |
| data/DataError.tsx | calm error + retry | `retry-note`, `states` EmptyState | ui-equal | |
| data/Delta.tsx | sign+arrow+colour change | `figures` Delta, `price-change` | ui-better | `price-change` has `convention` (green-up/red-up) and locale |
| data/Figure.tsx | tabular figure by kind | `figures` Figure, `money-display` | ui-better | exact `MoneyDisplay` for bigint minor units |
| data/Illustrative.tsx | "illustrative figures" label | — | web-only | marketing honesty label |
| data/MarketStatusChip.tsx | exchange clock + data date | `market-status` + `data-freshness` (rel) | ui-equal | two components, same two facts |
| data/ProvenanceNote.tsx | source + "may be delayed" | `data-freshness`, `states` Note | partial | no source/attribution slot in DataFreshness; S |
| data/Skeleton.tsx | CLS-safe skeleton | `states` Skeleton | ui-equal | third Skeleton in web; dedupe |
| data/Timestamp.tsx | `<time>` date-only with prefix/suffix | `data-freshness`, `nepal/date-only` formatCalendarDate | partial | DataFreshness is relative/instant; plain date-only stamp component missing (trivial) |
| dividends/* (bookLogic, labelsNe, ledger, text) | dividend book logic + copy | `portfolio` `dividendsByFiscalYear`, `nepal/calendar` | partial | `bsFiscalStartOn` (+56/+57 at 16 Jul approximation) → **ui `nepalFiscalYear` is exact (ui-better)**; rest is app logic |
| fundamentals/* (Board, Checklist, Detail, Ledger, Management, PeersTable, PillarPanel, States, Valuation, logic, copy, …) | fundamentals product | uses DataTable, CheckRow, StatusPill | web-only | PeersTable→`table`; States→`states` |
| gate/SignInFree.tsx, links.ts | paywall gate | `locked-note` | web-only | |
| layout/AccountMenu*.tsx | account menu | `menu` MenuButton (rel) | web-only | rebuild on ui Menu |
| layout/Footer, Navbar, NavPanels, PublicTabBar, navLinks, siteCopy-ne, siteLang, noticeStrip, barMarket*, SignInLink, SignedInPending, ToolPage, SearchPalette | site chrome/glue | `command-palette` under SearchPalette | web-only | |
| layout/PageLoader.tsx | route loading | `states` Skeleton | ui-equal | |
| layout/RouteAnnouncer.tsx | SPA route change live region | none | missing | generic (router-agnostic `RouteAnnouncer`), S |
| layout/Section.tsx (Section, Container) | marketing section rhythm | `stack` Stack/Cluster, `layout` PageLayout | web-only | uses `--rhythm-*`/`--mk-*` marketing tokens |
| layout/SiteSwitches.tsx | Lang/Theme switches | `controls` SegmentedSwitch | web-only | glue |
| layout/SkipLink.tsx | skip link | `financial` AppShell renders `pu-skip` internally | partial | **no standalone `SkipLink` export**; `--pu-z-skip-link` token exists; S |
| learn/LatestFromLearn, Sources, figures (KeyFacts, Timeline, RateShift, Callout, RoleCards, StepFlow) | editorial blocks | `corporate-action-timeline`/`payment-timeline` (domain timelines) | web-only | editorial |
| market/CostLedger.tsx | cost lines | `breakdown`, `bill-summary` | partial | layout |
| market/NepseToday.tsx, SectorInside.tsx | pages' parts | — | web-only | |
| market/RangeMark.tsx | 52-wk position mark | `meter` RangeMark/RangeBar | ui-equal | |
| market/RankTable.tsx | ranked table | `table` DataTable, `stock-table` | partial | rank column; S |
| market/StatCharts.tsx (Lines, SplitBars) | small stat charts | `performance-chart`, `bars` SplitBar | partial | |
| product/Product.tsx, content.ts | product marketing page | — | web-only | |
| screener-me/* (FilterBar, Results, link, logic, text) | screener | FilterChip, RangeSlider, Popover | web-only | rebuild FilterBar on ui once RangeEditor/FilterMenu exist |
| statements/StatementTable.tsx | statement with term links | `@punji/ui/statement-table` | partial | per-row term link/open-line slot |
| statements/TermChart, TermDetail, TermGate | glossary | — | web-only | |
| stocks/meters.tsx (RangeMeter, SplitBar, FlowBar, HiLoBar, MiniSpark) | stock-page meters | `meter` RangeBar, `bars` SplitBar/NetBar, `sparkline` | partial | RangeMeter `markers`, HiLoBar close mark; MiniSpark→Sparkline equal |
| ui/Accordion.tsx | FAQ accordion (`indexed`, analytics) | `@punji/ui/accordion` (rel) | ui-better | headingLevel, single/multiple, controlled. Wire `faq_opened` via `onValueChange`; `indexed` 01/02 numerals missing (cosmetic) |
| ui/AnnotatedShot.tsx | screenshot with markers | — | web-only | |
| ui/Badge.tsx | tone badge | `status-pill` | ui-equal | map `brand`/`lime`→`accent`/`gain` |
| ui/CodeBlock.tsx | labelled code sample | `@punji/ui/code-block` | ui-better | Copy button. Behaviour diff: ui wraps (`pre-wrap`), web scrolls (`pre` + focusable) |
| ui/CtaPanel.tsx, SectionIntro.tsx, RichText.tsx, ScreenCard.tsx (1053 lines), LinkIndex.tsx | marketing | — | web-only | |
| ui/FaqList.tsx | FAQ list + head | `accordion` (rel) | partial | as FaqSection |
| ui/Ledger.tsx | numbered editorial list | — | web-only | **name collision** with `@punji/ui/ledger` (accounting) |
| ui/NavIcon.tsx | second nav-icon set | none | missing | dedupe into icon set |
| ui/StatCard.tsx | value + label card | `stats` StatTile, `metric-tile` | ui-equal | |
| ui/TableScroll.tsx | focusable labelled scroll region, sticky first column | `table` DataTable | partial | no standalone `ScrollRegion` for hand-built tables; S |
| ui/ThemeToggle.tsx | theme button | `theme` (attributes only) | partial | see ThemeContext |
| ui/Toc.tsx + lib/toc.tsx | table of contents from headings | none | missing | generic, S |
| ui/icons.tsx | ~40 inline Lucide-style icons | none | missing | icon set gap |

### 2.4 `src/theme`, `src/hooks`, `src/lib`, `src/analytics`, `src/config`, `src/data`, `src/design`

| web path | what it is | ui equivalent | verdict | gap / migration note |
|---|---|---|---|---|
| theme/ThemeContext.tsx | provider: data-theme, localStorage, meta theme-color, toggle | `@punji/ui/theme` `themeAttributes`, `THEMES`, `DENSITIES` | partial | **no React `ThemeProvider`/`useTheme`/toggle with persistence**; ui adds `system`, `-hc`, density. S |
| hooks/useApiResource.ts | fetch resource | — | web-only | |
| hooks/useLivePrices.ts | live price feed | — | web-only | |
| hooks/useScrollReveal.ts | IntersectionObserver reveal | — | web-only | marketing |
| lib/useHydrated.ts | hydration flag | `@punji/ui/use-hydrated` | ui-equal | identical behaviour |
| lib/format.ts | rs, cr, int, pct, level, fixed, dates, devNumeral, shortCompany | `format`, `nepal/format`, `nepal/decimal`, `nepal/date-only`, `money` | partial | ui public API lacks `int`, `pct(signed)`, `pctOrDash`, `level`, `fixed`, `crFromRs`, `longDate`/`shortDate`/`tickLabel`/`longMonth` in web's exact output. `devNumeral`→`toScriptDigits` equal |
| lib/readerLang.ts | reader lang global, rsMark, monthName, dayMonthText, unitWords | `format` `setReaderLang`, `rsMark`, `unitWords` (rel) | partial | `monthName`, `dayMonthText`, `monthYearText` not upstreamed |
| lib/treemap.ts | squarify | `market-heatmap` `squarify` | partial | different signature; **ui throws on non-positive bounds, web returns []** |
| lib/feeSchedule.ts, sellMath.ts, calcExplainer.ts | NEPSE fees, CGT, sale math | `nepse-fees` (bigint, exact) | partial | ui exact but lacks dated CGT periods (`cgtPeriodOf`: pre-fy2083 / fy2083-84 / reduced) and must match backend contracts; keep `contracts/finance/fees` as source |
| lib/forex.ts | NRB rates data | `fx-rate` FxRateDisplay (rel) | partial | data stays in web; display can move |
| lib/rangeLabels.ts | label collision rows | none (internal to charts) | missing | generic chart util, S |
| lib/api, brokers, bullion, compareData, comparePairs, deferredComponent, dividends, hosts, learnIndex, learnSources, learnTerms, ledgerRoutes, livePrices, market, marketData, marketStats, pairPath, prerenderedFor, rotationGroups, rotationView, seasonIndices, seasonality, sectionState, sectorInside, sectorRotation, sectorSlug, sectorStats, securities, session, statements, statusNotice, stockIndex, stocks, translated | data, routing, auth, product logic | — | web-only | `market.signed/moveClass`→`price-change`/`toneOf` when rendering; `seasonality.BS_MONTHS` spelling differs from ui (`Asar/Asoj` vs `Ashadh/Ashwin`) |
| analytics/* (events, posthog, signIn, usePageviews, useScrollDepth) | PostHog | — | web-only | ui emits no analytics; wire via callbacks |
| config/plus.ts, stores.ts | pricing, store ids | — | web-only | |
| data/* (changelog, guides, statements, sectorNotes, compare-pairs, stock-slice) | content/data | — | web-only | |
| design/* (App, pages/*, registry, gallery, parts, searchIndex, generated JSON) | docs portal for design.punji.app | `punji-ui/site` | web-only | moving to punji-ui site per INTEGRATION §8; `design/contrast.ts` → `theme` `contrastRatio` (equal) |

---

## 3. Library gaps to build before migration (generic only, ranked)

Ranking = sites in web × regression risk if absent. Size S ≤ 1 day, M 2–4 days, L > 4 days.

1. **Release 0.3.0** (S, process): every rel item above (LinkProvider, Menu, Accordion, Breadcrumb, StatusBanner, DataFreshness, reader-language `rs`, ColumnChart inspection, z/motion tokens, colour-parity tokens) is unreleased. Nothing else matters until this ships.
2. **Icon set** `@punji/ui/icons` (M): tree-shakeable stroke icons on a 24 grid, `currentColor`, decorative by default, `title` for meaningful use; covers the UI-chrome and nav glyphs in `kit/NavIcon` (11 sites), `ui/NavIcon`, `SettingIcon`, `ui/icons.tsx` (~40), `NoticeIcon`, `InboxIcon`. Punji-only glyphs (logo) stay in web.
3. **Menu parity** in `@punji/ui/menu` (S): `MenuHead` (title/sub/lead), item `hint`, `next` chevron, `busy`, `lang`; controlled `open`/`onOpenChange`; **phone mode = bottom Sheet under a breakpoint** (RowMenu, 6 sites; MenuList 7).
4. **MarketStatus `offline` state + index figure slot** (S): add `'offline'` to `MarketState` (device lost connection, figures are last-known) and optional `index={{name,value,change,percent}}`; plus a `sessionSentence(schedule, now, labels)` helper for MarketMarkDetail (MarketMark 6 sites).
5. **PrivateAmount / amount masking** (S–M): `useAmountsHidden` store (localStorage, cross-tab sync, SSR-safe), `PrivateAmount` wrapper and `AmountsToggle`; `MoneyDisplay`/`Figure` `masked` prop rendering `Rs ••••••` aria-hidden with a "Amount hidden" name.
6. **ThemeProvider** (S): React provider/hook over `themeAttributes`: `theme` (`system|light|dark` + `contrast`, `density`), persistence key option, `setTheme/toggle`, `<meta name=theme-color>` sync, pre-hydration inline script string to avoid flash.
7. **Chart inspection layer** `@punji/ui/chart-inspect` (M): standalone hover/touch/keyboard cursor + live region for caller-drawn SVG charts (what ColumnChart uses internally), so web's LineSvg, StatCharts, ReturnBars, TwoLineChart, PillarPanel can drop `ChartInspect`.
8. **PerformanceChart extensions** (M): `referenceLines` (dashed target/benchmark level, TargetChart), drawdown band and a dotted "contributions" series (EquityChart), end-value legend (TwoLineChart), compact 3-level axis mode (TrendChart).
9. **Price-alert family** (M): `AlertRow` (full/compact/skeleton/empty), `AlertSummary`, pure `alertDistance`/`alertTarget`; AlertForm/AlertPanel stay in web on top (AlertRow 7 sites).
10. **DangerConfirm** (S): typed confirmation (`match`, case/space-normalised `confirmMatches`), `strength: 'caution'|'danger'` on `InlineConfirm` (or a new `DangerConfirm`).
11. **Heat tables** (M): `MonthGrid` (year × month returns, selectable month, BS/AD month headers via `nepal/locale` BS_MONTHS) and `ReturnsHeatTable` (subject × period, sortable heads) sharing one cell scale.
12. **Settings and list rows** (S): `SettingRow`/`SettingList` (disc or lead, title, line, trailing control/link) and `LinkRow` (whole-row link in a list, symbol never shrinks).
13. **BottomTabBar** (M): phone tab bar + More sheet, active by href, hides under sheets (`AppTabBar` shell; Punji tab config stays in web).
14. **Inbox + NotificationBell** (M): `NotificationBell` (99+ cap via `badgeText`, full count in name), `InboxList`/`InboxGroup`/`InboxRow`/`InboxSkeleton`.
15. **CardSection** (S): sections of a `flush` Card with heading, note and one right-side control; `CardSectionRow` weights.
16. **Histogram + RangeEditor + FilterMenu groups** (M): `Histogram` (bucket counts, kept-range highlight), `RangeEditor` (min/max fields + RangeSlider + histogram in a FilterPopover/phone sheet), grouped two-column `FilterMenu` with disabled-reason notes. Unblocks screener FilterBar.
17. **Instrument header** (S): `InstrumentHeader` (symbol never truncates, name ellipsis, price + `PriceChange`, optional tag, finder button mode) for QuoteHero/SymbolBlock/SecurityTitle.
18. **Small generic leftovers** (S each): `SkipLink` export; `RouteAnnouncer`; `TableOfContents` + `extractToc`; `ScrollRegion` (focusable labelled overflow with sticky first column); `Checklist` + `ProgressPill`; `HeadlineList`; `MarkToggleList`; `RatingScale`/`RatingChip` (N-step with `from`); `BarList`; `DivergingRows`/`PeriodHistory`; `ProgressRow`; `FloorGauge`; `BrokerBadge`; `displayCompanyName`; `LockedCell`/`LockedHead`/`LockedPreview`; `PromptCard`/`OutlineTile` variant of EmptyState; `ProvenanceNote` source slot on DataFreshness; date-only `Timestamp`.
19. **ReorderList** (M): generic drag + keyboard (Space pick, arrows, Space drop, Esc cancel) reorder with live announcements; Watchlist can reuse it.
20. **Charts with no ui counterpart** (M–L): `CorrelationMatrix` (M), `FlowWaterfall` (M), `PriceLevelChart`+`ProfileRail` (L).
21. **Formatter parity** (S): public `int`, `pct(n, {signed})`, `fixed`, `level`, and date-only `longDate/shortDate/tickLabel/longMonth` + `monthName/dayMonthText/monthYearText` (en/ne) with web's exact strings, or a golden test proving `formatCalendarDate` options reproduce them.

---

## 4. Token gaps (web token with no `--pu-*` equivalent)

All `--color-*` semantic, `--space-*`, `--radius-*`, `--text-xs..xl`, `--font-*`, `--tracking-*`, `--motion-*`, `--ease-out`, `--shadow-*`, `--control-*`, `--tap-min`, `--nav-height`, `--content-default`, `--seg-thumb*`, `--ambient` have `--pu-` names (some unreleased: colour-parity, token-scales). Missing in ui:

| Group | Web tokens | Recommendation |
|---|---|---|
| Type scale top | `--text-2xl`, `--text-3xl` | Add to ui (generic display sizes) |
| Easing | `--ease-in-out` | Add to ui |
| Radius | `--radius-tile` (1 use) | Map to `--pu-radius-16`/`--pu-radius-card` |
| Strong P&L | `--color-gain-strong`, `--color-loss-strong` (Badge text on soft fill) | Consider ui `--pu-color-gain-strong/loss-strong` (text-on-soft contrast) or use `--pu-color-gain/loss` |
| Accent hover | `--color-accent-hover` | Use `--pu-color-accent-fill-hover` |
| Brand palette | `--color-brand*` (13), `--color-lime-100..300`, `--color-primary(-hover)`, `--color-text-on-brand` | Stay in web (host brand) |
| Selected/inverted card | `--color-sel-*` (7), `--color-inv-fill/seg/track`, `--color-on-fill-gain/loss/muted` | Holdings-card specifics; stay in web or map to `--pu-color-inverse-*` |
| Marketing layout | `--mk-*` (21), `--measure-*` (4), `--rhythm-*` (3), `--gap-grid/split/tight`, `--gutter`, `--section-pad-block`, `--content-narrow`, `--scroll-offset`, `--faq-index`, `--h-fill`, `--learn-rate-ink` | Stay in web |
| Vendored app tokens | 86 `--v2-*` (generated from app monorepo) | Per INTEGRATION §3.3 decision: ui `tokens.css` canonical for UI tokens; keep `--v2-*` only for app-only values |
| z-index | web uses **raw numbers** (1, 2, 5, 20, 30, 40, 50, 60, 61, 70, 71, 80, 100) in `styles/*.css` | ui has a scale (`--pu-z-base/raised/sticky/dropdown/popover/overlay/modal/toast/tooltip/skip-link`); web should adopt it. Stacking risk where web uses 60/70/71 for sheets over the tab bar |
| ui-only (web lacks) | `--pu-font-weight-*`, `--pu-font-numeric`, z scale, density (`data-pu-density` compact/comfortable/spacious), `light-hc`/`dark-hc` | Web has no density or high-contrast handling today; free gain |

Value differences that will be visible: light `gain`/`loss` (ui PR #68), `--color-btn-line` raised to 3:1, `--v2-color-info` light darkened `#2f6fd6`→`#2a62c4`. Public host accent green `#0F6B4B` vs ui lime: web must override `--pu-color-accent*` per host.

Dark mode: web `ThemeContext` defaults to **dark** when nothing is stored and sets `data-theme` + `color-scheme` + meta `theme-color`; ui tokens default light and follow `prefers-color-scheme` only when `data-theme` is absent. Keep web's attribute script so the default stays dark.

Locale / Nepali: web uses `en-IN` grouping everywhere (lakh/crore) — same as ui. Devanagari digits: web `devNumeral` (integers only) vs ui `toScriptDigits` (any). BS calendar: web has **no BS converter**; it approximates fiscal year (`+57` from 16 July) in `dividends/ledger.ts`; ui `nepal/calendar` is table-based and exact. BS month names: web `Asar, Asoj` vs ui `Ashadh, Ashwin`. Nepali Gregorian month names: web hand-written array vs ui `Intl` `ne-NP`.

---

## 5. Dependencies that become removable

| Dep | Status |
|---|---|
| `uplot` (dependency) | **Removable now**: `components/charts/UPlotChart.tsx` has no importer; also drop `.kit-uplot` rules in `styles/me.css` and the pageCss baseline entries |
| `tailwindcss`, `@tailwindcss/vite` (dev) | Not removable by the migration alone: 58 files use utilities (Learn/Legal/Guide layouts, `components/ui/*`, `ToolPage`, and kit charts `ColumnChart`, `CandleChart`, `EquityChart`, `ReturnBars`, `WatchlistRow`). Becomes removable once those kit modules move to ui and the marketing/learn pages drop utilities |
| `react-router-dom`, `@supabase/*`, `zod`, `hono` | Stay (routing, auth, contracts, worker) |
| TradingView charting library (runtime, `public/`) | Stays (licensed advanced chart) |
| Scripts, not deps: `scripts/punji-ui-alias.mjs`, `design-props.mjs`, `kit-size*.mjs`, UI part of `sync-tokens.mjs`, 33 `kit*.css` (~4.5k lines), `tsconfig.app.json` 169 path entries | Removable as modules move |

No other third-party UI dependency exists (no Radix, no headless lib, no icon package, no date lib): icons are inline SVG, charts are hand SVG.

---

## 6. Risks (behaviour that can regress web)

1. **CSS cascade**: web `kit*.css` is unlayered; ui is `@layer punji.components`. While both load, web rules win for shared `kit-*` classes, masking or breaking migrated modules. Wrap web kit CSS in `@layer punji.legacy` first (INTEGRATION §3.3).
2. **Token names**: ui reads `--pu-*`; without a bridge migrated components render unstyled. Visible value changes listed in §4.
3. **Pagination off-by-one** (0→1-based) if only the prop name is changed.
4. **CheckRow class rename** `kit-check*`→`kit-crow*`: web CSS overrides and 34 kit tests selecting classes break.
5. **CompanySearch `clearOnOpen` default true**: finders that keep the typed query must pass `false`.
6. **Button new-tab label wording** changes for screen readers.
7. **Money formatting**: do not swap web `rs()` for ui `formatNPR` — that prints `NPR 1,234.00` / `रु` (no dot) and `—` for missing, where web prints `Rs 1,234.00` / `रु.` and `-`. Use ui `format.rs/cr` (rel), which match.
8. **Exactness**: web holds money as JS `number` (API floats, `round2`, 167 `toFixed`, 109 `rs(` calls). ui `MoneyDisplay`/`money`/`nepse-fees` need bigint minor units; converting `number × 100` reintroduces float error. Convert only from API strings (`parseMinorUnits`), or keep display-only `Figure kind="rs"` with numbers until the API sends decimals as strings.
9. **Fee math divergence**: ui `nepseFeeSchedule` example ("verify before use") has no dated CGT periods (2026-07-17 FY2083-84, 2026-09-22 reduced) or the 15% circuit band from 2026-04-20 that `contracts/finance/fees.ts` encodes and the backend shares. Replacing `sellMath`/`feeSchedule` with `estimateNepseTrade` without a schedule built from contracts and a golden parity test would change published numbers.
10. **BS fiscal year labels** change near 15–17 July when moving from web's approximation to ui's exact calendar (correct, but snapshot/golden tests and dividend book grouping shift).
11. **Dates via Intl**: ui `formatCalendarDate`/`formatNepalDate` use ICU (`en-GB`, `ne-NP`); output can differ between the Node prerender and browsers → hydration mismatches; web's hand-written month arrays are deterministic.
12. **Treemap**: ui `squarify` throws `RangeError` on zero/negative bounds; web returns `[]` (SSR/first render at width 0 would crash).
13. **Popover/Overlay timing**: portal + `useLayoutEffect` focus, Sheet focus/ids, Toast timing all changed; run web e2e (alerts, screener, portfolio forms).
14. **Analytics loss**: web `ui/Accordion` fires `faq_opened`; ui components fire nothing — wire `onValueChange` etc.
15. **MarketStatus has no `offline`**: swapping MarketMark would drop the offline indicator.
16. **CodeBlock** wraps long lines in ui (`pre-wrap`), web scrolls; code samples look different.
17. **`'use client'`** in every ui module: verify the SSR prerender build (`vite build --ssr`) does not warn/fail.
18. **Name collisions**: web `ui/Ledger` (editorial list) vs `@punji/ui/ledger` (accounting); web `OrderBook` vs ui `financial` `OrderBook` (different component) — the depth book is `OrderBookDepth`.
19. **Duplicates inside web** to collapse first (or the migration copies them): two `NavIcon`s, two `StoreButtons`, three Skeletons (`data/`, `kit/States`, `fundamentals/States`), two Figure/Delta pairs (`data/`, `kit/Figures`), two Sparklines (`kit/`, `charts/LineSvg`).

---

## 7. Stale content in punji-ui docs

`docs/INTEGRATION.md`
- §1 "version `0.0.0`" and §9.1 "first release is `0.1.0` … pins `0.1.0`": package is `0.2.0`, npm has `0.2.0`, tags `v0.1.0`, `v0.2.0`.
- §3.2 proposes per-module `src/components/app-kit/` wrappers to bind `linkComponent`: superseded by `LinkProvider` (`@punji/ui/link`, pending changeset `link-provider`). One provider at the app root replaces the wrappers.
- §3.1 OrderBookDepth "self-contained … because `MeterBar` is not in ui yet": `MeterBar` is in `@punji/ui/meter`.
- §1 "136 non-test app files import `@punji/ui`" vs `docs/audit/punji-web-kit-diff.md` "185 files": recount.
- §3.3 "tokens.css … 90 tokens" (kit-diff) / "a design decision I cannot make" (accent): ui now defines ~145 names and §9.2 already decided "one library theme, host accents as overrides".
- §3.1 "Status: every item below is closed … branch `feat/close-web-divergence`": closed, but the ColumnChart inspection and reader-language items it lists elsewhere are only in pending changesets — say "merged, unreleased".
- §5.6 says `scripts/sync-from-web.mjs` "already throws" and should be deleted after cut-over: still present (fine), but the doc should list it as the last step, not current state.

`docs/upstream-requests.md`
- "CompanySearch: avoid shadowing" — **done**: `inputLive` is in `src/company-search/CompanySearch.tsx:183`.
- "shortCompanyName: linear suffix matching" — **done** (single `\s`, equivalence test; kit-diff §4a).
- "Standalone number formatting" — partly done: `format.rs(n, lang)`, `cr`, `rsMark`, `unitWords` take an explicit language (pending changeset); but ui also added a `setReaderLang` global shim, which contradicts "without importing product language state" — document the shim as transitional.
- "StatusNotice: general and SSR-safe dismissal" — superseded by `@punji/ui/status-banner` (controlled `open`/`onOpenChange`, `dismissible`); the caller owns storage.

`docs/audit/punji-web-kit-diff.md`
- Blocker 1 "Router link … no open PR visible": shipped (pending release).
- §4 item 4 lists `RowMenu`, `MenuList` as missing: `@punji/ui/menu` now covers them partially (gaps in §3 item 3 here).
- §4 item 7 token list contradicts its own §7 (most are now present).
- §4 item 8 "CandleChart → candlestick-chart (unverified)": verified, ui-better. "BreadthBar → market-breadth": verified, ui-better. "WatchlistRow → watchlist": partial. "MonthGrid → calendar": wrong, Calendar is a date picker; MonthGrid is missing.

`COMPONENT-INVENTORY.md` (2026-10-31) predates Menu/Accordion/Breadcrumb/StatusBanner/DataFreshness/FxRate/LinkProvider; its "Planned entries (not built)" section should be re-checked.
