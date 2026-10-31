// The page registry: pure data, no JSX and no runtime imports, so the build
// script (scripts/site-gen.mjs) can import it under plain Node to validate it
// and to know which API entries need a generated props table.
//
// Adding a page = one entry here + one example file per variant in
// site/src/examples/<slug>/<id>.tsx. See site/README.md.

export type GroupId =
  | 'foundations'
  | 'financial-primitives'
  | 'stock-market'
  | 'portfolio'
  | 'accounting'
  | 'banking'
  | 'data'
  | 'forms'
  | 'layout'
  | 'feedback'
  | 'developer';

export interface Group {
  id: GroupId;
  title: string;
  /** Exports that exist in @punji/ui today but have no page yet. The build checks each is still exported. */
  planned: readonly string[];
}

/** The sidebar order. Domains, not component types. */
export const GROUPS: readonly Group[] = [
  { id: 'foundations', title: 'Foundations', planned: [] },
  { id: 'financial-primitives', title: 'Financial primitives', planned: ['Figure', 'Delta'] },
  { id: 'stock-market', title: 'Stock market', planned: ['PriceChart', 'Sparkline', 'StockLabel', 'CompanySearch', 'LiveFigure'] },
  { id: 'portfolio', title: 'Portfolio & investment', planned: ['Breakdown', 'ShareBar', 'ShareDonut', 'MeterBar', 'RangeBar', 'HeadlineFigure', 'KeyStats'] },
  { id: 'accounting', title: 'Accounting & bookkeeping', planned: ['DataRows', 'ValueRow', 'FactList', 'FinancialSummary'] },
  { id: 'banking', title: 'Banking & payments', planned: ['StatusPill', 'CheckList', 'StepList', 'LockedNote'] },
  { id: 'data', title: 'Data & analytics', planned: ['Pagination', 'DistributionBar'] },
  { id: 'forms', title: 'Forms & inputs', planned: ['Field', 'NumberField', 'Select', 'Checkbox', 'Switch', 'RangeSlider', 'SymbolField', 'TextAreaField', 'Calendar'] },
  { id: 'layout', title: 'Layout & navigation', planned: ['AppShell', 'PageHeader', 'Drawer', 'Tabs', 'Card', 'Popover', 'CommandPalette'] },
  { id: 'feedback', title: 'Feedback & states', planned: ['EmptyState', 'InlineState', 'RetryNote', 'Note', 'Skeleton', 'ToastProvider'] },
  { id: 'developer', title: 'Developer utilities', planned: [] },
];

export interface ApiRef {
  /** The export name. */
  name: string;
  /** The published subpath without the package name: 'money-display', 'nepal/format'. '' means the root. */
  module: string;
}

export interface ExampleDef {
  /** File name without extension: site/src/examples/<slug>/<id>.tsx. */
  id: string;
  /** The variant switcher's label. */
  title: string;
  /** One sentence under the preview. */
  note?: string;
}

export interface PageDef {
  slug: string;
  title: string;
  group: GroupId;
  kind: 'foundation' | 'component' | 'utility' | 'hooks';
  /** The overview: what it is and the one rule that matters. */
  summary: string;
  use: readonly string[];
  avoid: readonly string[];
  /** Exports documented on the page. Import statements and props tables are generated from these. */
  api: readonly ApiRef[];
  /** The live previews, first is the default. The code shown is the file that renders. */
  examples: readonly ExampleDef[];
  keyboard: readonly string[];
  accessibility: readonly string[];
  responsive: readonly string[];
  /** Extra "Security boundary" or "Limits" section: title and points. */
  notes?: { title: string; points: readonly string[] };
  related: readonly string[];
}

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const PAGES: readonly PageDef[] = [
  {
    slug: 'colour-tokens',
    title: 'Colour tokens',
    group: 'foundations',
    kind: 'foundation',
    summary:
      'Every colour is a --pu-color-* CSS variable defined in @punji/ui/tokens.css. Light and dark follow the system; data-theme="light" or "dark" on any element forces one for that subtree. Components read tokens, never literals, so overriding a token moves everything built on it.',
    use: ['Read tokens in your own CSS with var(--pu-color-text) so your screens follow the theme.', 'Override a token on a wrapper to re-theme one subtree.'],
    avoid: ['Copying hex values into your CSS: they will not follow dark mode.', 'Using colour alone to show gain or loss: the sign and words must carry it.'],
    api: [],
    examples: [{ id: 'swatches', title: 'Swatches', note: 'Read from the shipped tokens.css at build time, both themes side by side.' }, { id: 'override', title: 'Override a subtree', note: 'data-theme on a wrapper forces one theme for everything inside it.' }],
    keyboard: ['Tokens are not interactive.'],
    accessibility: ['Text tokens are checked for contrast against their surfaces in both themes by the package visual gate.', 'Gain and loss tokens are always paired with a sign or word in components.'],
    responsive: ['Tokens do not change with width; type and spacing tokens that do are on their own pages.'],
    related: ['typography', 'spacing'],
  },
  {
    slug: 'typography',
    title: 'Typography',
    group: 'foundations',
    kind: 'foundation',
    summary: 'Two font stacks (body and display) and a fluid text scale. Figures use tabular digits so columns of money align. The stacks include Mukta, so Devanagari renders without a layout shift.',
    use: ['Use --pu-text-* for sizes so type scales between phones and desktops.', 'Use tabular figures (font-variant-numeric: tabular-nums) for anything numeric you lay out yourself.'],
    avoid: ['Fixed pixel font sizes for body copy.', 'Proportional digits in tables of money.'],
    api: [],
    examples: [{ id: 'scale', title: 'Scale' }, { id: 'devanagari', title: 'Devanagari', note: 'Nepali text and digits in the same stack.' }],
    keyboard: ['Type is not interactive.'],
    accessibility: ['Sizes use rem and clamp(), so browser text-size settings are respected.', 'Set lang on Nepali content so screen readers choose the right voice.'],
    responsive: ['The scale is fluid: it grows with the viewport between its clamp() bounds.'],
    related: ['colour-tokens', 'spacing'],
  },
  {
    slug: 'spacing',
    title: 'Spacing and shape',
    group: 'foundations',
    kind: 'foundation',
    summary: 'A short space scale, a control height scale (32, 36, 44) and radii. Every control reads the one height scale, so a Button, a Select and a SegmentedControl line up in a toolbar.',
    use: ['Use --pu-space-* for gaps and padding.', 'Use --pu-control-md to align your own element with library controls.'],
    avoid: ['Controls shorter than --pu-tap-min on touch screens.', 'Inventing radii: use --pu-radius-control or --pu-radius-card.'],
    api: [],
    examples: [{ id: 'scale', title: 'Scale' }, { id: 'controls', title: 'Control heights', note: 'sm 32, md 36, lg 44 on the same row.' }],
    keyboard: ['Spacing is not interactive.'],
    accessibility: ['--pu-tap-min (44px) is the minimum touch target the controls hold on phones.'],
    responsive: ['Space tokens are fixed rem values; layouts reflow with container width, not with a different scale.'],
    related: ['colour-tokens', 'typography', 'button'],
  },
  {
    slug: 'money-display',
    title: 'MoneyDisplay',
    group: 'financial-primitives',
    kind: 'component',
    summary:
      'One exact amount in any currency. The amount is a bigint of minor units (or an exact decimal string); digits are tabular; sign, symbol and spacing follow the locale; a screen reader hears the full currency name when a symbol is shared. A missing value is a dash with a spoken "No value", never zero.',
    use: ['Any money a reader sees: balances, prices, fees, totals.', 'With nepalMoneyConfig() for lakh and crore grouping.', 'compact for tight spaces, knowing it is display-rounded.'],
    avoid: ['Formatting a number that is not money: use Figure or formatNepalNumber.', 'Showing the result of a calculation: compute with @punji/ui/calculations, then display the bigint it returns.', 'Passing a floating-point number: it would lose exactness, so the type does not allow it.'],
    api: [...ui('money-display', 'MoneyDisplay'), ...ui('money', 'MoneyFormatConfig')],
    examples: [
      { id: 'currencies', title: 'Currencies', note: 'Configuration, not code, selects the currency.' },
      { id: 'nepal', title: 'Nepal', note: 'The Nepal preset: lakh/crore grouping, optional Devanagari digits.' },
      { id: 'states', title: 'Accounting and missing', note: 'Accounting negatives and a missing value.' },
    ],
    keyboard: ['Not interactive; it renders text.'],
    accessibility: ['Renders a <data> element whose value attribute holds the exact decimal, with the full currency name spoken when the symbol is shared.', 'A missing value is announced as "No value" (override with missingLabel).', 'Sign is text, not colour.'],
    responsive: ['Never truncates. Use compact where a column is narrow; the exact amount stays in the spoken text.'],
    related: ['price-change', 'currency-input', 'formatters', 'metric-tile'],
  },
  {
    slug: 'price-change',
    title: 'PriceChange',
    group: 'financial-primitives',
    kind: 'component',
    summary: 'The move between two prices as an absolute amount and a percent. Direction is carried by the sign, an arrow shape and a spoken word, never by colour alone. Colour follows a convention: green up (default) or red up.',
    use: ['Under a price in a table row (size="sm") or beside a headline figure.', 'red-up for markets that use that custom.'],
    avoid: ['Deriving a change you were given: pass the published change as `change`.', 'Using it for non-price deltas such as headcount.'],
    api: ui('price-change', 'PriceChange'),
    examples: [
      { id: 'directions', title: 'Up, down, flat' },
      { id: 'convention', title: 'Colour convention', note: 'Same data, red-up. The arrow and sign do not change.' },
      { id: 'sizes', title: 'Compact', note: 'size="sm" for a table row.' },
    ],
    keyboard: ['Not interactive.'],
    accessibility: ['Spoken as "up 5.50 (5.50%)" using the labels you pass; translate them with `labels`.', 'The arrow is decorative; the sign is in the text.'],
    responsive: ['Wraps its percent under the amount if the container is too narrow.'],
    related: ['money-display', 'financial-calculations', 'data-table'],
  },
  {
    slug: 'currency-input',
    title: 'CurrencyInput',
    group: 'financial-primitives',
    kind: 'component',
    summary: 'A money field. Text is grouped in the currency locale as you type, Devanagari and Arabic-Indic digits are accepted, and more fraction digits than the currency allows (JPY 0, USD 2, KWD 3) are refused, never rounded. The value is an exact decimal string plus bigint minor units; it never passes through Number.',
    use: ['Entering an amount to pay, transfer or trade.', 'Validate the bigint yourself (minimum, maximum, balance) and pass `error`.'],
    avoid: ['Quantities or percentages: use NumberField.', 'Reading the display text: read onValueChange.'],
    api: [...ui('currency-input', 'CurrencyInput', 'CurrencyInputChange')],
    examples: [
      { id: 'basic', title: 'USD', note: 'Type digits; the third decimal is refused.' },
      { id: 'nepal', title: 'NPR', note: 'Lakh grouping as you type.' },
      { id: 'validation', title: 'With validation' },
    ],
    keyboard: ['Standard text input: type, paste, Tab in and out.', 'Paste is refused whole when it holds currency text or a letter; paste the number only.'],
    accessibility: ['Native <label for>; the accessible name includes the currency name.', 'Hint and error are wired through aria-describedby and aria-invalid; the error is a live role="alert".'],
    responsive: ['Fills its container; size="lg" gives a 44px target for forms.'],
    related: ['money-display', 'formatters', 'button'],
  },
  {
    slug: 'financial-calculations',
    title: 'Financial calculations',
    group: 'financial-primitives',
    kind: 'utility',
    summary: 'Pure TypeScript for positions and ratios: no React, no browser, no dependency. Ledger functions use bigint minor units and a rounding mode you choose; ratio functions are display-only numbers in percent units. Currency-agnostic.',
    use: ['Cost basis, realised and unrealised P&L, break-even and allocation.', 'Compute with these, then display with MoneyDisplay.'],
    avoid: ['Floating-point arithmetic for money.', 'Treating rates as built in: rates are strings you take from a verified current source.'],
    api: [
      ...ui('calculations', 'computePosition', 'valuePosition', 'breakEvenPrice', 'taxOnGain', 'allocation', 'applyRate', 'divideRounded'),
      ...ui('calculations', 'percentageChange', 'priceChange', 'returnOnCost', 'cagr', 'dividendYield', 'weightedAverage'),
    ],
    examples: [
      { id: 'position', title: 'Position and P&L', note: 'FIFO cost basis with a bonus-share lot and a partial sale.' },
      { id: 'allocation', title: 'Allocation', note: 'Largest remainder: shares always sum to exactly 100.' },
      { id: 'ratios', title: 'Ratios' },
    ],
    keyboard: ['Not a UI module.'],
    accessibility: ['Nothing to render. Display results with MoneyDisplay or PriceChange.'],
    responsive: ['Not applicable.'],
    notes: {
      title: 'Limits',
      points: ['Out of scope: short positions, corporate actions other than bonus and rights, tiered broker fee schedules, loss carry-forward and any built-in tax rate.', 'Ratio functions return null where the ratio is undefined (zero or negative base), never NaN or Infinity.'],
    },
    related: ['money-display', 'price-change', 'formatters'],
  },
  {
    slug: 'formatters',
    title: 'Formatters',
    group: 'financial-primitives',
    kind: 'utility',
    summary: 'Generic money formatting (any currency, from Intl) beside the Nepal helpers (lakh/crore, Devanagari, BS dates). All accept exact inputs and never round silently.',
    use: ['formatMoney for any currency from bigint minor units.', 'formatNPR, formatMinorUnits and the market formatters for Nepal screens.', 'parseMoney as the strict inverse for input.'],
    avoid: ['formatNPR on ledger values: its number input is a display value, not exact.', 'Parsing decorated display text: the parsers accept input, not receipts.'],
    api: [
      ...ui('money', 'formatMoney', 'formatCompactMoney', 'parseMoney', 'createMoneyFormatter', 'nepalMoneyConfig'),
      ...ui('nepal/format', 'formatNPR', 'formatPercent', 'formatNepalNumber'),
      ...ui('nepal/financial-format', 'formatMinorUnits'),
      ...ui('nepal/market-format', 'formatChange', 'formatBasisPoints', 'formatQuantity', 'formatPrice'),
    ],
    examples: [
      { id: 'generic', title: 'Generic money', note: 'USD, JPY (0 decimals), KWD (3), EUR.' },
      { id: 'nepal', title: 'Nepal', note: 'Lakh and crore, Devanagari, compact.' },
      { id: 'market', title: 'Market values' },
    ],
    keyboard: ['Not a UI module.'],
    accessibility: ['Output is plain text. Set lang on the element when you print Devanagari digits.'],
    responsive: ['Use formatCompactMoney where width is tight; compact output is display-rounded.'],
    related: ['money-display', 'currency-input', 'financial-calculations'],
  },
  {
    slug: 'order-book',
    title: 'Order book',
    group: 'stock-market',
    kind: 'component',
    summary: 'OrderBookDepth draws the best bids and asks side by side with depth bars and a buy/sell split. OrderBook is the plain table. Both are display only: no order placement, no inferred market data.',
    use: ['Showing a published depth for one symbol.', 'OrderBookDepth when relative size matters; OrderBook when you want a table and your own formatters.'],
    avoid: ['Anything that places or cancels orders.', 'Computing totals you were not given: pass `totals` when the exchange publishes them.'],
    api: [...ui('order-book', 'OrderBookDepth', 'BookLevel', 'OrderBookDepthLabels'), ...ui('financial', 'OrderBook')],
    examples: [
      { id: 'depth', title: 'Depth', note: 'Best first on both sides; the longer side sets the row count.' },
      { id: 'table', title: 'Plain table' },
    ],
    keyboard: ['Not interactive; read it as a table.'],
    accessibility: ['A real <table> with a caption and four named columns; depth bars are decorative.', 'The split bar is described in words by labels.buyTotal and labels.sellTotal.'],
    responsive: ['Fits a phone; at 390px quantities and prices stay tabular and never truncate.'],
    related: ['price-change', 'data-table', 'money-display'],
  },
  {
    slug: 'metric-tile',
    title: 'MetricTile and SummaryFigure',
    group: 'portfolio',
    kind: 'component',
    summary: 'MetricTile is one headline figure with its label, an optional meter and a note, laid out in a MetricRow. SummaryFigure is the one figure a reader acts on, between hairlines inside a card. The figure never truncates.',
    use: ['MetricRow of four portfolio totals: invested, return, value, what a sale would pay.', 'SummaryFigure for the single number a card exists to show.'],
    avoid: ['More than one inverse tone in a row.', 'A bare FinancialSummary list is better when you have a plain metrics array with no meters.'],
    api: [...ui('metric-tile', 'MetricTile', 'MetricRow'), ...ui('summary-figure', 'SummaryFigure')],
    examples: [
      { id: 'row', title: 'MetricRow', note: 'Four tiles; two by two on a phone.' },
      { id: 'summary', title: 'SummaryFigure' },
    ],
    keyboard: ['Not interactive.'],
    accessibility: ['Labels and values are real text; the meter is decorative so the figure is always printed.', 'MetricRow takes a label that names the group for screen readers.'],
    responsive: ['Tiles use container queries: four across where there is room, two by two otherwise.'],
    related: ['money-display', 'price-change', 'column-chart'],
  },
  {
    slug: 'data-table',
    title: 'DataTable and FinancialTable',
    group: 'data',
    kind: 'component',
    summary: 'FinancialTable takes typed rows and render callbacks with a stable row key, semantic row headers, controlled sorting, and loading, error and empty states. DataTable is the lower-level table it is built on. The table never mutates or sorts your data.',
    use: ['Holdings, invoices, transactions and ledgers.', 'Controlled sort, search, pagination and selection (with the table hooks).'],
    avoid: ['Putting business rules in the table: filter and sort in your own state.', 'Hiding columns by clipping: they stay reachable through horizontal overflow.'],
    api: [...ui('financial', 'FinancialTable', 'FinancialColumn'), ...ui('table', 'DataTable')],
    examples: [
      { id: 'holdings', title: 'Holdings', note: 'Sortable columns, money and price change in cells.' },
      { id: 'states', title: 'States', note: 'Loading, error and empty are built in.' },
      { id: 'paged', title: 'Search and pages', note: 'Controlled search and pagination with usePagination.' },
    ],
    keyboard: ['Sort headers are buttons: Tab to one, Enter or Space to sort.', 'Search, pagination and selection controls are native controls in tab order.'],
    accessibility: ['A real <table> with a caption, scoped headers and aria-sort on the sorted column.', 'The first column can be a row header for screen-reader navigation.', 'Loading is announced with a status label; errors with role="alert".'],
    responsive: ['Wide tables scroll horizontally inside their container; columns can fold away under set widths (hideUnder).'],
    related: ['money-display', 'price-change', 'hooks', 'csv-export'],
  },
  {
    slug: 'column-chart',
    title: 'ColumnChart',
    group: 'data',
    kind: 'component',
    summary: 'One column per period with its parts stacked from the baseline, the total printed over each column and a round labelled scale that includes zero. Never smoothed, never 3D. Missing values are drawn as nothing and written "none" in the data table, never zero.',
    use: ['Revenue, dividends or flows by fiscal year or quarter.', 'Stacked parts that add to a meaningful total.'],
    avoid: ['Long continuous price series: use a line chart.', 'More series than the legend and data table can tell apart without colour.'],
    api: [...ui('column-chart', 'ColumnChart', 'ColumnSeries', 'ColumnDatum')],
    examples: [
      { id: 'stacked', title: 'Stacked', note: 'Two series by fiscal year.' },
      { id: 'single', title: 'Single series' },
      { id: 'negative', title: 'With a reversal', note: 'Negative parts stack below the baseline; the printed total is the net.' },
    ],
    keyboard: ['Not interactive; read the data table instead.'],
    accessibility: ['The drawing is aria-hidden; a visually hidden table (period, each series, total) carries every value.', 'Series are told apart by the legend and table, not by colour alone.'],
    responsive: ['The plot is as wide as its container; labels shorten and thin out (latest always shown) before anything overlaps. Height is clamped to 96 to 480px.'],
    related: ['metric-tile', 'data-table', 'money-display'],
  },
  {
    slug: 'csv-export',
    title: 'CSV export',
    group: 'data',
    kind: 'utility',
    summary: 'toCsv writes RFC 4180 CSV from typed rows and column definitions; downloadText hands the file to the browser. Cells that start with =, +, -, @, tab or carriage return are neutralised by default so a spreadsheet will not run exported data as a formula.',
    use: ['Letting a reader export a table they can already see.', 'bom: true so Excel reads UTF-8.'],
    avoid: ['Turning neutralizeFormulas off for any data that a user typed.', 'Exporting columns the reader is not allowed to see.'],
    api: [...ui('export', 'toCsv', 'CSV_MIME'), ...ui('download', 'downloadText')],
    examples: [
      { id: 'basic', title: 'Download', note: 'Builds the CSV and downloads it. The preview shows the exact text.' },
      { id: 'injection', title: 'Formula injection', note: 'Hostile cells before and after neutralisation.' },
    ],
    keyboard: ['Trigger the download from a real button so it is keyboard operable.'],
    accessibility: ['The download button needs a name that says what it exports and the format.'],
    responsive: ['Not applicable to the CSV; the trigger is an ordinary button.'],
    notes: {
      title: 'Security boundary',
      points: [
        'Client-side neutralisation reduces the risk of a spreadsheet running exported data. It does not replace server-side validation: validate and constrain what is stored, authorise what a user may export, and neutralise on the server for any CSV the server generates or emails.',
        'Exports contain whatever you pass in. Mask or omit sensitive columns before calling toCsv.',
        'A cell of type number is exempt (a finite number cannot hold a formula), so -5 stays numeric; the string "-5" is prefixed. Use keepNumericText on a column whose format emits plain machine numbers.',
        'Date, bigint and object cells throw unless the column has a format function: there is no implicit locale or time zone, and the error names the column, never the value.',
        'downloadText is browser-only and in its own subpath so server code never imports it. File names pass through safeFilename; nothing leaves the browser.',
        'neutralizeFormulas: false is for trusted, machine-generated data only.',
      ],
    },
    related: ['data-table', 'hooks'],
  },
  {
    slug: 'date-picker',
    title: 'DatePicker',
    group: 'forms',
    kind: 'component',
    summary: 'A date field with a calendar popover. Gregorian (AD) and Bikram Sambat (BS) with a switch between them, Nepali or English labels and digits, strict typed input, min and max bounds, unavailable days and keyboard navigation. Values are date-only ISO strings (YYYY-MM-DD), never instants.',
    use: ['Choosing a transaction, due or statement date.', 'DateRangePicker for reporting periods.'],
    avoid: ['Choosing a time of day: this is date-only.', 'Converting the value to a timestamp without choosing a time zone.'],
    api: [...ui('date-picker', 'DatePicker', 'DateRangePicker')],
    examples: [
      { id: 'ad', title: 'AD' },
      { id: 'bs', title: 'BS (Nepali)', note: 'Bikram Sambat with Nepali labels and Devanagari digits.' },
      { id: 'range', title: 'Range' },
    ],
    keyboard: ['Arrow keys move one day (left, right) or one week (up, down); Home and End move to the week boundaries.', 'Page Up and Page Down change month; Shift with them changes year. Enter or Space selects.', 'Escape closes the popover and restores focus to the trigger; Tab leaves in form order.'],
    accessibility: ['Typed input is strict and reports errors through `error` with aria-invalid.', 'Selected days expose aria-selected, today aria-current and unavailable days aria-disabled; month changes are announced through a live heading.'],
    responsive: ['The popover fits a 390px viewport; touch targets are 44px.'],
    notes: { title: 'Limits', points: ['BS support is bounded by the converter table; dates outside it are rejected, not guessed.', 'Not yet reviewed with VoiceOver or NVDA (see ROADMAP.md).'] },
    related: ['currency-input', 'button'],
  },
  {
    slug: 'button',
    title: 'Button',
    group: 'forms',
    kind: 'component',
    summary: 'Primary, secondary, ghost and danger, in three sizes (32, 36, 44), icon-only with a required accessible name, and a loading state. With href it renders a link styled as a button.',
    use: ['One primary per view; secondary for every other action.', 'danger only for a confirmed destructive action.', 'loading while an action is pending.'],
    avoid: ['Two primaries in one view.', 'An icon-only button without a name.', 'A button that navigates: give it href.'],
    api: ui('button', 'Button', 'ButtonVariant'),
    examples: [
      { id: 'variants', title: 'Variants' },
      { id: 'sizes', title: 'Sizes' },
      { id: 'states', title: 'Loading and icon-only' },
    ],
    keyboard: ['Tab to focus; Enter or Space activates.', 'A loading button is disabled: not clickable and skipped by Tab, with aria-busy set.'],
    accessibility: ['A real <button> (or <a> with href); focus-visible outline on every variant.', 'loading sets aria-busy. Icon-only buttons require `label`.', 'An absolute http(s) href opens a new tab, adds rel noopener noreferrer and speaks newTabLabel.'],
    responsive: ['sm is for toolbars; lg (44px) for a form\'s or phone bar\'s main action. block fills the container.'],
    related: ['spacing', 'currency-input'],
  },
  {
    slug: 'hooks',
    title: 'Hooks overview',
    group: 'developer',
    kind: 'hooks',
    summary: 'Component-free React hooks from one subpath, @punji/ui/hooks (each also has its own). SSR-safe: nothing touches the browser while rendering. Callback identities are stable and timers and listeners clean up.',
    use: ['useDebounce for search, useLocalStorage for persisted preferences, useClipboard for copy buttons.', 'usePagination, useTableSelection and useColumnVisibility beside DataTable.'],
    avoid: ['Storing tokens, secrets or account data in web storage: any script on the origin can read it.', 'Using useHydrated to hide server-renderable content.'],
    api: [
      ...ui('hooks', 'useDebounce', 'useDebouncedCallback', 'useThrottle', 'useControllableState', 'usePrevious', 'useToggle', 'useClipboard', 'useLocalStorage', 'useSessionStorage', 'useClickOutside', 'usePagination', 'useTableSelection', 'useColumnVisibility', 'useMediaQuery', 'useHydrated', 'useStableOrder'),
    ],
    examples: [
      { id: 'debounce', title: 'useDebounce' },
      { id: 'clipboard', title: 'useClipboard', note: 'This site\'s own copy button uses it.' },
      { id: 'storage', title: 'useLocalStorage', note: 'This site\'s theme switch uses it with a validator.' },
    ],
    keyboard: ['Hooks have no UI.'],
    accessibility: ['useClipboard reports `copied` for a short confirmation: announce it (role="status") rather than relying on a colour change.'],
    responsive: ['useMediaQuery takes a server fallback; use CSS for purely visual layout.'],
    notes: {
      title: 'Storage safety',
      points: ['Stored data is untrusted. `validate` is required: a stored value is returned only if it parses and passes it; otherwise you get defaultValue and error: "invalid".', 'Write failures (quota, serialize, unavailable) are returned in `error`, never thrown during render.'],
    },
    related: ['data-table', 'csv-export'],
  },
];

export const pageBySlug = (slug: string): PageDef | undefined => PAGES.find((p) => p.slug === slug);
