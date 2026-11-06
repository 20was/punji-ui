# punji-web kit vs @punji/ui: diff for migration (audit P0-1b)

Date: 2026-11-07. Step 1 of moving punji-web onto the published `@punji/ui` (0.2.0). Read-only comparison of `punji-web/src/components/kit/` (167 modules, plus `index.ts` and a `__tests__` folder) against `punji-ui/src/*`. Nothing in punji-web was changed. Method: the alias rule in `punji-web/scripts/punji-ui-alias.mjs` (kebab-case of the file name), export-name diff, `diff -w` of each matched pair, and `grep` of import sites. Behaviour was read, not run; "identical" means no behavioural diff found in the source diff. Counts are static and approximate.

Summary: **56 of 167 kit modules have a punji-ui counterpart; 111 are missing in punji-ui.** Of the 56, 14 are near-identical, most of the rest are punji-ui supersets (types, `linkComponent`, i18n, RTL, a11y), 2 have kit-only extras and a handful diverged and need a decision (section 2). The 111 missing include several heavily used ones (`NavIcon`, `AlertRow`, `MenuList`, `RowMenu`, `CtaBand`, `FaqSection`, `MarketMark`).

Related: [component-matrix.md](component-matrix.md) (root-export names only), [README.md](README.md).

## 1. Usage weight

`@punji/ui` is imported from 185 punji-web files outside the kit: 125 through the barrel and the rest through subpaths. Import sites below are files importing the module through a subpath, plus files importing one of its exported names from the barrel (a file importing two names of one module counts once).

### Matched modules, by use (all 56)

| Module (subpath) | Subpath | Barrel | Total | Router dep in kit |
|---|---:|---:|---:|---|
| button | 10 | 76 | 86 | yes |
| states | 9 | 53 | 62 | |
| format | 9 | 45 | 54 | |
| controls | 7 | 38 | 45 | |
| card | 10 | 31 | 41 | |
| status-pill | 4 | 35 | 39 | yes |
| overlay | 5 | 30 | 35 | |
| card-link | 19 | 0 | 19 | yes |
| meter | 16 | 0 | 16 | |
| figures | 1 | 15 | 16 | |
| company-search | 2 | 13 | 15 | |
| fields | 0 | 15 | 15 | |
| locked-note | 8 | 7 | 15 | |
| layout | 0 | 14 | 14 | yes |
| retry-note | 14 | 0 | 14 | |
| check-row | 13 | 0 | 13 | yes |
| summary-figure | 13 | 0 | 13 | |
| select | 1 | 11 | 12 | |
| info-tip | 11 | 0 | 11 | |
| live-figure | 0 | 11 | 11 | |
| metric-tile | 10 | 0 | 10 | |
| show-more | 0 | 10 | 10 | |
| table | 2 | 8 | 10 | |
| drawer-screen, inline-confirm, inline-state, rows (yes), step-list | 9 each | | 9 | rows only |
| compact 8, drawer 6, fact-list 6, sparkline 6, switch 6 | | | 6-8 | |
| stats 5, bars 4, breakdown 4, column-chart 4, key-stats 4, link-table (yes) 4, list-filter 4, status-tag 4 | | | 4-5 | link-table |
| tabs 4, avatar 3, checkbox 3, command-palette 3, floating-tooltip 3, popover 3 | | | 3-4 | |
| filter-chip 2, pagination 2, chart-scale 2, choice-group 1, order-book 1, range-slider 1, command-keys 1, live 1, combo-step 0 | | | 0-2 | |

### Missing modules, by use (top 20 of 111)

| Module | Sites | Router dep | Module | Sites | Router dep |
|---|---:|---|---|---:|---|
| NavIcon | 11 | | CardSection | 4 | |
| AlertRow | 7 | yes | InboxList | 4 | |
| MenuList | 7 | yes | MarketReport | 4 | |
| CtaBand | 6 | | PromptCard | 4 | |
| FaqSection | 6 | | SettingRow | 4 | yes |
| MarketMark | 6 | | WatchSummary | 4 | |
| RowMenu | 6 | | BarButton | 4 | |
| alertTarget (ts) | 6 | | GroupCounts | 4 | |
| AlertSummary | 5 | | ActionNotice, AppStrip, ... | 3 each | |
| LinkRow | 5 | yes | | | |
| ProductShot | 5 | | | | |

The other ~90 missing modules have 1-3 sites each. A `punji-web/src/components/ui/` set (17 files, not aliased) is outside this audit; `CodeBlock` and `Ledger` there have punji-ui analogues (`code-block`, `ledger`), `NavIcon` is duplicated there.

## 2. Matched pairs: comparison

Common to every matched pair: class prefix is `kit-` on both sides (punji-ui kept it), exports are named the same, and punji-ui files start with `'use client'`, import with `.tsx` extensions, and export `*Props` interfaces the kit leaves inline. Differences that repeat across pairs:

- **Router.** The kit imports `Link` from `react-router-dom` (17 kit files). punji-ui has no router dependency: a component taking `href` renders a plain `<a>`, or the `linkComponent` prop (`src/internal/link.tsx`: `LinkComponent = ComponentType<AnchorProps & {href}>`). Router-bound kit props are `to`-style internally but `href` in the public API on both sides, so call sites do not change; they must pass `linkComponent`. No provider yet (see blockers).
- **CSS side effects.** Every kit module does `import '../../styles/kit*.css'`. punji-ui modules import no CSS.
- **RTL.** punji-ui adds `pu-flip` on directional icons and `insetInlineStart` where the kit used `left` (`Meter`, `Pagination`, `CheckRow`).
- **Heading level.** punji-ui adds `headingLevel` (`PageHeader`, `EmptyState`); defaults match the kit (h1 / h2).
- **Number inputs to formatters.** The kit formatters `rs`, `cr`, `compactRs` read a module-global reader language (`lib/readerLang.ts`, `setReaderLang`, set by the account `LangProvider`): `Rs` vs `रु.`, Nepali month names, `crore` vs `करोड`. punji-ui `internal/number.ts` hard-codes `Rs` and has no global; `compactRs` takes a `mark` argument instead. Money is `number` in both; punji-ui's bigint `Money` type (`src/money`, PR #65 `feat/money-path`) is separate and not used by `Figure`/`Delta` yet.

### Classification, the 56 pairs

**Identical or near-identical** (diff is imports and formatting only): `avatar`, `card`, `filter-chip`, `floating-tooltip`, `range-slider`, `chart-scale`, `combo-step`, `command-keys`, `show-more` (adds `ShowMoreProps`), `tabs`, `switch`, `checkbox`, `inline-state`, `fact-list`.

**punji-ui superset** (kit API fully contained; extras listed):

| Module | punji-ui additions |
|---|---|
| button | `stacked`, `external`, `newTabLabel` (default "(opens in a new tab)"), `linkComponent`; new-tab link label now `"{name} {newTabLabel}"` |
| card-link | `linkComponent`; default `newTabLabel` English only (see kit extras) |
| fields | `Field.trailingAction`; `NumberField` gains `maxFractionDigits`, `grouping` (south-asian/western/none), `onValueChange` (parsed result), `step`/`min`/`max`, `steppers` with hold-to-repeat, `stepperLabels`, Devanagari/Bengali/Arabic-Indic/Thai digit input via `nepal/decimal` |
| table | `DataTable` search, pagination and selection (`DataTableSearch/Pagination/Selection`), locale-aware labels |
| popover | `portal` (boolean or element), `width`, `positionAnchor`; visualViewport-aware repositioning; skips `<select>` native-picker outside-click |
| pagination | locale-pack labels via `useLocaleMessages`; driven by `usePagination` (but API diverges, below) |
| check-row | `linkComponent`; arrow-key roving inside `role=tablist` `CheckList`; `0` as a valid `figure` |
| layout, rows, link-table, status-pill | `linkComponent`; `PageHeader.headingLevel`; `Props` types |
| overlay | `SheetProps`, `ToastProviderProps`, `DockProps`; PR #62 (open) fixes Sheet focus, ids, Toast timing |
| states | `EmptyState.headingLevel` |
| column-chart | `values` accept `null`/`undefined`; `ColumnChartLabels` (i18n) and exported `ColumnChartProps` |
| bars, breakdown, controls, company-search, drawer, drawer-screen, info-tip, inline-confirm, key-stats, list-filter, live-figure, locked-note, metric-tile, select, step-list, summary-figure, stats, status-tag, figures, sparkline | `*Props` types, i18n/RTL, `devWarn`; `sparkline` adds `maxPoints` and `reduceSeries` (min/max-preserving downsample, `memo`); `company-search` uses shared `comboStep`; `live-figure` exports `LiveProps` |
| format | `parseNumber` accepts any `DIGIT_SCRIPTS` (kit: Devanagari only); `cycleKey` returns `null` for empty lists; `shortName` trims on a single whitespace char (kit `\s+`, a possible regression) |
| compact | `compactRs(value, units, from, mark)` takes the rupee mark; kit reads `rsMark()` |
| meter | `ScaleStep` type, non-finite guards, `insetInlineStart` |
| live | adds a `format` import; same exports |
| drawer-screen | `DrawerScreenProps`, `DrawerHeaderProps`, `DrawerBodyProps`, `DrawerFooterProps` |

**Kit has extras** (upstream first):

| Module | Kit-only | Note |
|---|---|---|
| card-link | `NEW_TAB_PUNJI` (`{en:'(opens punji.app in a new tab)', ne:'(punji.app नयाँ ट्याबमा खुल्छ)'}`) | App-specific copy; keep in punji-web, pass as `newTabLabel` |
| column-chart | `mirrorScaleTop`, and the kit `ChartInspect` (`../charts/ChartInspect`: hover/focus inspection of a column, `chart-inspect.css`) | punji-ui has no inspect layer; `ColumnChart` there is static. Used in `design/registry.ts` and `brokerPolish.test.tsx` |

**Diverged: needs a decision**

| Module | Kit | punji-ui | Impact |
|---|---|---|---|
| pagination | `page` is 0-based, `onPage`, `prevLabel`; also exports `pageCount`, `pageOf` | `page` is 1-based and clamped, `onPageChange`, `previousLabel`, locale labels; no `pageCount`/`pageOf` (use `paginate`) | 2 call sites, but a silent off-by-one if the prop is renamed alone. Prefer a codemod |
| check-row | classes `kit-check*`, `kit-checks` | classes `kit-crow*`, `kit-crows` (renamed to stop colliding with the `Checkbox` `kit-check` class) | punji-web CSS and tests that select `.kit-check-*` must be renamed; `CheckList` `role=list` no longer forwards `onKeyDown` |
| order-book | `OrderBook`, `OrderBookLabels`; depth split drawn with `MeterBar` | `OrderBookDepth`, `OrderBookDepthLabels`; own `kit-ob-split` markup | Rename; 1 site. Note: punji-ui README mentions a display-only `OrderBook`; the `order-book` subpath exports only `OrderBookDepth` |
| format `rs`/`cr` | locale-aware global | always `Rs` | Nepali account pages would print `Rs`. Needs a locale decision |
| button new-tab text | `aria-label` is the name only | `aria-label="{name} {newTabLabel}"`, or a `kit-sr` span when unnamed | Screen-reader wording differs slightly; align copy |
| popover | inline, `useEffect`-based focus | portal-capable, `useLayoutEffect` | Behaviour is a superset but focus/position timing differs; run web e2e |
| table | `DataTable` (simple) | `DataTable` plus tools | CSS differs (`kit-table-tools`, `kit-table-search`); sort icon class retained |

Not exhaustively read: `meter` (71 changed lines, guards and logical properties), `popover` (95), `overlay` (24), `drawer-screen` (38), `summary-figure` (29), `figures` (29), `states` (31). No functional regressions were spotted in the sampled hunks; assume "superset" until the visual tests run against real data.

## 3. External dependencies of the kit (blockers for extraction)

| Dependency | Kit files | Where | Resolution |
|---|---|---|---|
| `react-router-dom` `Link` | 17 (7 matched, 10 missing: AlertRow, MenuList, LinkRow, SettingRow, MenuPanel, PersonTile, ProgressRow, RatingChangeRow, AppTabBar, BrokerLookup) | `to=` links | `linkComponent` per component today; a provider is needed (section 5) |
| `../../lib/format` (`rs`, `int`, `fixed`) | 4 | Figures, format, compact, Meter | `internal/number.ts` covers it, minus the reader-language mark |
| `../../lib/readerLang` | 2 | `rsMark` | Add a locale input |
| `../charts/ChartInspect`, `../charts/geometry` | 5 | ColumnChart, CandleChart, ReturnBars, TwoLineChart | Extract `ChartInspect` into punji-ui first |
| `../../lib/rotationView`, `seasonality`, `contracts/seasonality`, `hosts`, `rangeLabels`, `layout/navLinks` | 13 | Rotation*, Season*, MarketMark, nav | Business logic: keep these modules in punji-web, or split data from view |
| `react-dom` (portals) | 8 | Drawer, Popover, InfoTip... | Peer dependency on both sides |
| `react-router-dom` / `react-dom` as peers | | | punji-ui peers are `react`, `react-dom` only (^19) |

## 4. Upstream first (kit does it, punji-ui lacks it)

1. **Link provider** so `href` components route in-app without per-call `linkComponent` (PR pending; see section 5).
2. **ChartInspect** (hover/keyboard inspection) and `mirrorScaleTop` for `ColumnChart`, plus `CandleChart`, `ReturnBars`, `TwoLineChart` which depend on it.
3. **Reader-language rupee mark** in `rs`/`cr`/`compactRs`/month names: a locale-context-aware formatter (the locale pack exists in `src/locale`), keeping the Western-digit rule.
4. **`NavIcon`** (11 sites) and the `nav-icons.css` set; **`RowMenu`**, **`MenuList`/`MenuPanel`**, **`CardSection`**, **`CtaBand`**, **`FaqSection`**, **`MarketMark`**, **`SettingRow`**, **`LinkRow`**.
5. **Alert family**: `AlertRow`, `AlertSummary`, `AlertForm`, `AlertPanel`, `alertTarget`, `alertDistance`, `RangeEditor`, `RuleSentence` (the audit README lists these as pending).
6. **Pagination decision** (0- vs 1-based) and a one-line codemod; `pageCount`/`pageOf` helpers or documented `paginate` replacements.
7. **Tokens missing in punji-ui**: `--color-btn-line`, `--color-chart-fill`, `--color-focus-ring`, `--color-inverse-shimmer(-hi)`, `--color-on-accent`, `--color-surface-elevated`, `--content-default`, `--font-mono`, `--nav-height`, `--radius-tile`, `--shadow-card`, `--space-5/6/8/10/12`, `--text-xl`, `--tracking-label`, `--v2-color-info` (some may be defined locally in web CSS; verify).
8. Charts without a punji-ui counterpart: `TrendChart`, `EquityChart`, `PriceLevelChart`, `TargetChart`, `Histogram`, `CorrelationMatrix`, `FlowWaterfall`, `QuarterBars`, `ReturnsHeatTable`, `RotationMap`. Possible partial equivalents (unverified): `CandleChart` to `candlestick-chart`, `MarketStrip` to `market-indices`, `BreadthBar` to `market-breadth`, `WatchlistRow` to `watchlist`, `MonthGrid` to `calendar`.

Keep in punji-web (not generic): `SiteHeader`, `SiteFooter`, `AppTabBar`, `Logo*`, `StoreButtons`, `ProductShot`, `LandingSection`, `FeatureCard`, `TmsAnatomy/Address`, `Broker*`, `Rotation*`, `Season*` and anything calling `lib/*` market data.

## 4a. Upstreamed (feat/upstream-kit-gaps)

- **Reader-language mark.** `@punji/ui/format` now exports `rs(n, lang?)`, `cr(n, lang?)`, `rsMark(lang?)`, `unitWords(lang?)`, `readerLangOf`, and the shim `setReaderLang` / `readerLang` (same names as the kit's `lib/readerLang`). Default is English and identical to before. `Figure` and `Delta` (`kind="rs"`) take the mark from `PunjiLocaleProvider` (or a `mark` prop). `formatFigure(value, 'rs', dp, mark)` takes a 4th `mark`. For `compactRs` pass `unitWords(lang)` and `rsMark(lang)`. Replace the kit's `import { rs, cr } from 'lib/format'` with the `@punji/ui/format` ones and call `setReaderLang` from the same `LangProvider`. Kit month names (`monthName`, `dayMonthText`) are not upstreamed.
- **ColumnChart inspection.** Hover/touch tooltip, keyboard cursor (arrows, Home, End, Escape), live region, `lit` column, and `mirror` / `net` / `mirrorScaleTop`, using the same cursor as `CandlestickChart`. The plot is now one focus stop (the drawing inside is still `aria-hidden`). The kit's `ChartInspect` itself is not extracted; `CandleChart`, `ReturnBars`, `TwoLineChart` are still pending.
- **`shortCompanyName`.** Not a regression: the single `\s` plus `.trim()` gives the same result as the kit's `\s+` for every input (the trim takes the rest of a run), and avoids `\s+` backtracking on long whitespace runs. A test pins the equivalence.

### Migrating from punji-web kit: Pagination

Do not rename `page` alone: the kit is 0-based, `@punji/ui` is 1-based.

| punji-web kit | `@punji/ui` |
|---|---|
| `page={page}` (0-based) | `page={page + 1}` |
| `onPage={(p) => setPage(p)}` | `onPageChange={(p) => setPage(p - 1)}` |
| `prevLabel` | `previousLabel` |
| `nextLabel`, `pageLabel`, `rangeLabel`, `maxNumbers`, `total`, `pageSize`, `label`, `testId` | unchanged |
| `pageCount(total, size)` | `paginate(total, 1, size).pageCount` |
| `pageOf(index, size)` (0-based page) | `pageOfIndex(index, size) - 1` |

Or keep your state 1-based and drop the `+ 1` / `- 1`, using `usePagination` and `<Pagination {...pager} onPageChange={pager.setPage} />`. Out-of-range pages are clamped on both sides. The same table is on the Pagination docs page.

## 5. Proposed migration order, blockers

**Order** (each group is one PR in punji-web, behind the alias until the last step):

1. **Pure, no router, identical**: avatar, card, checkbox, switch, filter-chip, floating-tooltip, range-slider, tabs, show-more, fact-list, inline-state, chart-scale, combo-step, command-keys, live (about 35 sites). Swap the alias entry to the package one module at a time.
2. **Superset, no router**: states, controls, overlay, select, fields, info-tip, drawer, drawer-screen, inline-confirm, retry-note, locked-note, metric-tile, summary-figure, step-list, stats, key-stats, breakdown, bars, meter, figures, sparkline, status-tag, list-filter, company-search, popover, live-figure, table (300+ sites; `states`, `controls` and `overlay` dominate). After the formatter locale fix: format, compact.
3. **Router-bound, after the link provider**: button, card-link, status-pill, check-row, layout, rows, link-table (about 185 sites; `button` alone is 86). Plus the CSS rename for check-row.
4. **Pagination and order-book** (renames) with a codemod.
5. **Missing modules**, in this order: NavIcon, RowMenu, MenuList/MenuPanel, CardSection, CtaBand/FaqSection, then alerts, then charts with ChartInspect. Anything business-coupled stays in punji-web and imports `@punji/ui` for primitives.

**Blockers**

1. **Router link.** A `LinkProvider` PR is said to be in progress in punji-ui; no open PR with that name is visible in `gh pr list` at the time of writing (open: #61-#65). Until it lands, group 3 needs an app-level `RouterLink` passed to every component, which is about 185 call sites. Design requirement: context-provided `LinkComponent`, explicit `linkComponent` prop still wins, absolute http(s) URLs still a plain `<a>`.
2. **CSS cascade and tokens**, below.
3. **Reader-language formatting** (`rs`, `cr`, month names).
4. **ChartInspect** and the charts that need it.
5. **Pagination** off-by-one.

### CSS notes

| Aspect | punji-web | @punji/ui |
|---|---|---|
| Entry | per-module side-effect imports; `styles/kit.css` (1052 lines) imports `kit-button.css`; with `kit-*.css` about 4,560 lines, plus page CSS | one `@punji/ui/styles.css` or `@punji/ui/css/<name>.css` per module |
| Cascade | unlayered | `@layer punji.tokens, punji.components` |
| Tokens | `--color-*`, `--space-*`, `--text-*`, `--radius-*`, `--font-*`, `--motion-*`, `--ease-out`, `--shadow-*` (`styles/tokens.css`, `tokens.generated.css`) | `--pu-color-*` etc. (`src/styles/tokens.css`, 90 tokens, `docs/tokens.md`) |
| Class prefix | `kit-` | `kit-` (same; `kit-crow` for CheckRow) |
| Theme | `data-theme` | `data-theme` plus `data-pu-density`, `-hc` variants |

- Unlayered punji-web CSS beats layered punji-ui CSS regardless of order. While both are loaded, the old `kit-*.css` rules will override the package for any shared `kit-` class. Migrate a module and delete its web rules in the same PR, or load the web kit CSS inside a lower layer first.
- Tokens: add a bridge in punji-web (`--pu-color-text: var(--color-text)` etc., generated from the 178 `var(--…)` names kit CSS uses) so punji-ui renders on the web theme, then invert it. About 80 of the names are module-local custom properties (`--k-*`, `--kit-*`, `--plc-*`, `--mg-*`, `--rb-*`) set inline or in the same sheet and need no bridge.
- Per-module CSS from the package needs `import '@punji/ui/css/<name>.css'`; or load `styles.css` once and accept the size (check `npm run size`).
- Tests that assert class names or snapshot kit DOM (`components/kit/__tests__`, 34 files) need regenerating after each group.

## 6. Reproducing

- Module map and counts: the rule in `punji-web/scripts/punji-ui-alias.mjs`; imports via `grep "@punji/ui"` on `punji-web/src`.
- Re-run `npm run audit:web -- /path/to/punji-web` for the root-export matrix.

## 7. punji-web → @punji/ui token mapping

Date: 2026-11-07. Updates item 7 of section 4 now that the colour tokens (this change) and the radius, space and type scales (#70) exist. Rule: a punji-web `--name` is `--pu-name` in `@punji/ui` (`--color-text` is `--pu-color-text`). Source: `punji-web/src/styles/tokens.css`, `me-theme.css` (light and dark values). Values below are the `@punji/ui` ones; where they differ from punji-web, the reason is given.

### Colour tokens added for parity

| punji-web | @punji/ui | Light | Dark | Notes |
|---|---|---|---|---|
| `--color-btn-line` | `--pu-color-btn-line` | `#7a7e78` | `#6e7480` | Outlined button edge. punji-web: `#c5c9bd` / `#2e3237`, which are 1.5:1 and 1.3:1 on `surface`. Raised to the `border-control` values so the edge is 3:1 (WCAG 1.4.11) |
| `--color-chart-fill` | `--pu-color-chart-fill` | `rgba(200, 242, 61, 0.3)` | `rgba(200, 242, 61, 0.1)` | Area under a chart line. Same as punji-web. Decoration, not contrast-checked; `createTheme` derives it from the brand chart colour |
| `--color-focus-ring` | `--pu-color-focus-ring` | `#3f6a00` | `#c8f23d` | punji-web reads it with a `--color-text` fallback and never defines it. Here it equals `accent`, which the focus outlines used before, so all 56 `outline: Npx solid var(--pu-color-accent)` rules now read this token with no visual change. 3:1 or more on `bg`, `surface`, `surface-tint`, `surface-elevated` |
| `--color-inverse-shimmer`, `-hi` | `--pu-color-inverse-shimmer`, `-shimmer-hi` | `rgba(255, 255, 255, 0.07)`, `0.12` | `rgba(18, 19, 20, 0.07)`, `0.12` | Skeleton shimmer on inverse surfaces. Same as punji-web |
| `--color-on-accent` | `--pu-color-on-accent` | `#ffffff` | `#0d0e10` | Text on `--pu-color-accent` itself. Not the same as `on-accent-fill` (text on the lime fill). Same as punji-web. 6.42:1 and 14.92:1 |
| `--color-surface-elevated` | `--pu-color-surface-elevated` | `#ffffff` | `#1f2226` | Same as the punji-web theme (`me-theme.css`); its generated token is `--v2-color-sheet-float` |
| `--v2-color-info` | `--pu-color-info` | `#2a62c4` | `#8fb8ff` | Info text and icons. punji-web light is `#2f6fd6`, 3.84:1 on `bg`; darkened to reach 4.5:1 on `bg`, `surface` and `surface-tint`. Dark is the same |

High-contrast values (`light-hc`, `dark-hc`) are in `src/styles/contrast.css` and `docs/tokens.md`.

### All punji-web tokens

| punji-web | @punji/ui | Status |
|---|---|---|
| `--color-accent`, `-accent-fill`, `-accent-fill-hover`, `-bg`, `-border`, `-border-control`, `-border-default`, `-border-strong`, `-card-border`, `-chart`, `-gain`, `-gain-soft`, `-link`, `-loss`, `-loss-soft`, `-on-accent-fill`, `-on-loss`, `-scrim`, `-series-3` to `-series-12`, `-series-nepse(-soft)`, `-shimmer-base`, `-shimmer-highlight`, `-surface`, `-surface-inverse`, `-surface-solid`, `-surface-subtle`, `-surface-tint`, `-tag-bg`, `-tag-text`, `-text`, `-text-inverse`, `-text-muted`, `-text-tertiary`, `-track`, `-warn`, `-warn-accent`, `-inverse-gain`, `-inverse-line`, `-inverse-loss`, `-inverse-muted`, `-inverse-nepse`, `-inverse-row`, `-inverse-warn` | same name under `--pu-` | Present (light gain and loss differ by design: PR #68) |
| `--color-btn-line`, `-chart-fill`, `-focus-ring`, `-inverse-shimmer(-hi)`, `-on-accent`, `-surface-elevated`; `--v2-color-info` | `--pu-color-*` as above | Added here |
| `--seg-thumb`, `--seg-thumb-shadow`, `--ambient` | `--pu-seg-thumb`, `--pu-seg-thumb-shadow`, `--pu-ambient` | Present |
| `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-card` | `--pu-shadow-*` | Present (`-md`, `-card` from #70) |
| `--radius-sm`, `-md`, `-lg`, `-xl`, `-2xl`, `-3xl`, `-card`, `-control`, `-full` | `--pu-radius-*` | Present. `sm` to `3xl` are deprecated aliases (#70); the scale is `--pu-radius-4/6/8/12/16/24/full` |
| `--space-1` to `-4`, `-5`, `-6`, `-8`, `-10`, `-12`, `-16`, `-20`, `-24` | `--pu-space-*` | Present (4px scale, #70) |
| `--text-xs`, `-sm`, `-base`, `-lg`, `-xl` | `--pu-text-*` | Present (`-xl` from #70). `--text-2xl`, `--text-3xl` have no equivalent |
| `--font-body`, `--font-display`, `--font-mono`, `--font-code` | `--pu-font-*` | Present (#70) |
| `--tracking-display`, `--tracking-label`, `--nav-height`, `--content-default` | `--pu-tracking-*`, `--pu-nav-height`, `--pu-content-default` | Present (#70) |
| `--motion-fast`, `--motion-base`, `--ease-out` | `--pu-motion-*`, `--pu-ease-out` | Present. `--ease-in-out` has no equivalent |
| `--control-sm`, `-md`, `-lg`, `--tap-min` | `--pu-control-*`, `--pu-tap-min` | Present |
| `--radius-tile` | none | Not added: a single punji-web use; map to `--pu-radius-16` or `--pu-radius-card` |
| `--color-gain-strong`, `--color-loss-strong`, `--color-accent-hover`, `--color-primary*`, `--color-brand*`, `--color-lime-*`, `--color-text-on-brand` | none | App or brand palette: stay in punji-web (use `--pu-color-gain`, `-loss`, `-accent-fill-hover`) |
| `--color-sel-*`, `--color-inv-*`, `--color-on-fill-*` | none | Holdings-card and inverted-card specifics; keep in punji-web or use `--pu-color-inverse-*` |
| `--mk-*`, `--measure-*`, `--rhythm-*`, `--section-pad-block`, `--gap-*`, `--content-narrow`, `--scroll-offset`, `--faq-index` | none | Marketing site layout: keep in punji-web |
