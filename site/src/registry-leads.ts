// The one-line lead under each page title: plain words for someone deciding whether to use the library.
// At most 140 characters (site-gen checks). Kept in its own map so the page registries merge cleanly;
// a page may also set `lead` directly on its entry, which wins over this map. Without either, the page
// falls back to the first sentence of its `description`.

export const LEADS: Readonly<Record<string, string>> = {
  // Get started
  using: 'What the package is, what state it is in, and the three lines it takes to show your first exact amount.',
  nextjs: 'Load the styles in your root layout, know which components need the client, and pass money across the server boundary safely.',
  vite: 'A new Vite and React app showing Punji UI components in a few minutes, plus the one setting you need when linking locally.',
  theming: 'Restyle everything with CSS variables: light and dark, your own accent, or a different look for one section of a page.',
  ssr: 'Render on the server and hydrate with no warnings and no flash of the wrong theme.',
  tailwind: 'Use Tailwind for page layout and Punji UI for components, with one line of CSS so neither overrides the other by accident.',
  'live-data': 'Stream prices into tables and figures through a small adapter, so components stay pure and every update keeps exact amounts.',
  security: 'What the package does to keep your users safe, and the parts that stay your responsibility.',
  roadmap: 'What shipped in 0.1.0, what is being worked on now, and what is planned for later releases.',
  agents: 'Which component to use for which job, the checks to run before calling work done, and the bar every new component meets.',

  // Foundations
  'colour-tokens': 'Every colour is a CSS variable with a light and a dark value, so your own screens can follow the same theme.',
  typography: 'A type scale that grows with the screen, with digits that line up in columns of money and Devanagari that just works.',
  spacing: 'One spacing scale and one control height scale, so buttons, selects and inputs line up wherever you put them.',

  // Financial primitives
  'holdings-table': 'Every holding with value, cost, P&L and weight, computed exactly from your trades and quotes, with totals and CSV export.',
  'portfolio-allocation': 'Where the money sits, by holding or sector, as a donut or bar whose shares always add up to exactly 100%.',
  'portfolio-overview': "The headline numbers of a portfolio in one block: value, today's change, invested, unrealised and realised P&L, return.",
  'dividend-history': 'Cash, bonus and rights received per fiscal year, with Bikram Sambat labels, an exact table and yield on value or cost.',
  'transaction-history': 'Every buy, sell, bonus, rights and dividend, filterable by type, symbol and date, with realised P&L on each sale.',
  'money-display': 'Show an amount of money exactly as it is stored: any currency, the right symbol and sign, never a floating-point rounding error.',
  'price-change': 'How much a price moved, as an amount and a percent, with an arrow and words so it reads correctly without colour.',
  'currency-input': 'A money field that formats as people type and never silently rounds what they entered.',
  'financial-calculations': 'Exact maths for money and positions in plain TypeScript: totals, averages and returns, with the rounding rule spelled out.',
  formatters: 'Turn exact values into text for any currency and locale, including lakh and crore grouping and Nepali dates.',
  figure: 'Plain numbers and changes that line up in columns and are never cut off, with direction shown by sign and arrow.',

  // Stock market
  'order-book': 'Bids and asks side by side with depth bars and a buy and sell balance, for a quote screen.',
  'candlestick-chart': 'Daily price candles with volume and moving averages, navigable by keyboard and backed by a readable data table.',
  'depth-chart': 'The order book as cumulative depth on each side of the mid price, with the spread marked.',
  'stock-table': 'A sortable quote board: symbol, last price, change, volume, turnover and a trend line, with exact prices throughout.',
  'market-movers': 'Top gainers, losers and most active stocks as tabs over one compact table, ranked for you.',
  'market-indices': 'Index values with their daily change, as cards or a slim strip for a page header.',
  'market-status': 'Whether the market is open, closed, pre-open or on holiday, in words and with a distinct icon.',
  'price-limit': 'Where today\'s price sits between the lower and upper circuit limits, with a clear flag when it hits one.',
  watchlist: 'The stocks someone follows, in their own order, updating in place as prices change.',
  'market-heatmap': 'The whole market at a glance: tile size is weight, colour and a signed number show the day\'s change.',
  'market-breadth': 'How many stocks rose, fell and stayed flat, as one split bar with the counts and the A/D ratio in words.',
  'price-chart': 'A small line chart for a short price series, with gaps shown as gaps and a table behind every point.',
  sparkline: 'A tiny trend line to sit beside a number in a table row or card.',
  'company-search': 'Find a company by symbol or name, with ranked suggestions as you type and a full-screen sheet on phones.',
  'live-figure': 'A number that animates to each new live price and flashes once in the direction it moved.',

  // Portfolio
  'metric-tile': 'Headline figures for a dashboard, like invested, current value and return, laid out in an even row.',
  'performance-chart': 'A portfolio\'s return over time against a benchmark such as NEPSE, with a keyboard readout and a data table.',
  breakdown: 'Show how a total is made up, one line per part with the total ruled off, like a receipt.',
  'share-bars': 'Parts of a whole as a stacked bar or a ring, always with a written legend.',
  'meter-range': 'Small bars that show progress toward a target, or where a value sits within its range.',
  'headline-figure': 'The one big number at the top of a page, with its changes as small chips beside it.',
  'key-stats': 'A tidy grid of facts like market cap, P/E and 52-week range, with missing values said in words.',
  'split-bars': 'Bars that print beside numbers: parts of a whole, ups and downs from a centre line, and a net amount.',

  // Accounting
  'debit-credit': 'One ledger amount with its side, such as 12,500.00 Dr, written so screen readers say debit or credit.',
  'ledger-table': 'A general ledger for one account, with debits, credits and a running balance from opening to closing.',
  'journal-entry': 'One journal entry with its lines and totals, and a plain warning when it does not balance.',
  'trial-balance': 'All accounts by debit and credit with exact totals and a clear Balanced or Out of balance line.',
  'statement-table': 'Income statements, balance sheets and cash-flow reports from structured data, one column per period.',
  'payment-status': 'Whether an invoice is paid, partly paid, unpaid, overdue or void, as a labelled pill.',
  'period-selector': 'Pick a reporting period such as a fiscal year, quarter or month, with Nepal fiscal years built in.',
  'ledger-helpers': 'Exact bookkeeping maths in plain TypeScript: journal checks, running balances, trial balances and CSV export.',
  rows: 'A card of tappable rows with a title, a figure and a note, plus simple label and value lists.',
  'financial-summary': 'A responsive grid of totals you have already calculated, each with a label and a short note.',

  // Banking
  'account-number': 'A masked account number with a reveal button that hides it again by itself, and an optional copy button.',
  'bank-account-card': 'An account at a glance: bank, holder, masked number, balance you can hide, and quick actions.',
  'transaction-list': 'Bank transactions grouped by day, with money in and out shown by sign, arrow and words.',
  'payment-receipt': 'A printable receipt with amount, fees, exact total, masked accounts and a copyable reference.',
  'payment-timeline': 'The steps of a payment from initiated to completed or failed, each with a time and a status.',
  'beneficiary-selector': 'Choose who to pay from favourites and recent payees, searchable and fully usable by keyboard.',
  'banking-helpers': 'Plain TypeScript for banking screens: masking, IBAN checks, references, time zones and safe CSV.',

  // Data
  'data-table': 'A typed table for financial rows with sorting, sticky headers, search, pagination and loading, error and empty states.',
  'column-chart': 'Columns per period, stacked if needed, with totals printed on top and a scale that starts at zero.',
  'chart-math': 'The maths behind the charts as plain functions: ticks, scales, moving averages and downsampling.',
  'csv-export': 'Export rows to CSV that opens safely in Excel or Sheets, and let people download it in one call.',

  // Forms
  'date-picker': 'A date field with a calendar for both the Gregorian and Bikram Sambat calendars, in English or Nepali.',
  button: 'Primary, secondary, ghost and danger buttons in three sizes, with loading and icon-only forms.',
  field: 'Labelled text, number, price and date inputs with hints and errors that screen readers announce.',
  select: 'A dropdown built on the native select, so it works everywhere and still matches the theme.',
  'segmented-control': 'A compact switch between a few options, like 1D, 1W and 1M on a chart.',
  tabs: 'Switch between the views of one section, with full keyboard support.',
  checkbox: 'Checkboxes for choices that can each be on or off, with room for a colour swatch or a count.',
  switch: 'An on or off setting that applies immediately, with a busy state while it saves.',
  'range-slider': 'Pick a minimum and maximum on one track, for filters like price or dividend yield.',
  'choice-group': 'A row of mutually exclusive filters built on real radio buttons.',
  'list-filter': 'A search box that filters a list already on the page, with a clear button and an optional slash shortcut.',

  // Layout
  card: 'The standard surface for one section of a page, with an optional header, count and action.',
  'card-link': 'The single link in a card header, which says so when it opens a new tab.',
  'link-table': 'A short list where every row opens something, with figures aligned on the right.',
  pagination: 'Page through a long list with a range label, page numbers and previous and next buttons.',
  popover: 'A small panel that opens under its button and closes on Escape or a click outside.',
  drawer: 'A side panel that slides over the page for a form or details, keeping focus inside until it closes.',
  'command-palette': 'A Command-K search dialog with grouped results, run entirely from the keyboard. This site\'s search uses it.',
  'page-layout': 'The page frame: a header with title, meta line and actions, and section headers below it.',
  'app-shell': 'The landmarks of an app page: skip link, header, navigation, main area and footer.',

  // Feedback
  'inline-state': 'Show locked, failed, empty or offline states right where the data would have been.',
  'retry-note': 'When one part of a page fails to load, say so in place with a Try again button.',
  'empty-skeleton': 'Empty and error states, small notes, and loading placeholders that hold their space.',
  'check-list': 'A list of checks or settings, each with a status icon, a short line and a status in words.',
  'step-list': 'Numbered steps for what to do first, with the current step marked.',
  toast: 'Short messages about what just happened, such as saved or failed, with an optional undo.',
  tooltip: 'A label on hover and focus, and an info button that explains a term on any device.',
  'status-pill': 'Short labels for a state or tag, such as Open, Bonus or New, plus a count badge.',
  'locked-note': 'A plain note that a view is not included in this account, instead of a blurred fake.',

  // Forms and feedback additions
  chip: 'A pill you press to filter or toggle, and a single-choice row of them, for sectors, quick amounts and section jumps.',
  'filter-chip': 'One filter that is set, in words, that you press to edit and remove with its x.',
  'show-more': 'The last line of a long list in its card: Show all 24, then Show fewer.',
  'inline-confirm': 'Ask before a destructive action, in the place of the row that asked, with the danger button naming what goes.',
  avatar: 'A person\'s initials in a circle for account lines and lists. Never a photo.',
  'status-tag': 'The state of a setting at the end of its row, in a word or two, read and never pressed.',
  'stat-grid': 'A grid of labelled figures with notes: two across on a phone, four on a wide screen.',
  sheet: 'A short modal decision with Tab trapped and Esc to close, and a Dock that keeps the main action in reach.',
  'drawer-screen': 'The inside of a Drawer: header, body and a footer that keeps Save and Cancel in reach.',
  'chart-scale': 'Round-tick Y scales that make a value line fill its plot, and name a second series that is far away.',

  stack: 'Put children in a column or a wrapping row with a gap from the spacing scale, with no CSS of your own.',
  'code-block': 'Show a CSV or JSON export as plain monospace text, with an optional label and a Copy button.',

  // Utilities
  hooks: 'Small React hooks for clipboard, storage, media queries, pagination and more, all safe to render on the server.',
};

/** Short sidebar labels for pages whose title names several exports. A page's own `navTitle` wins. */
export const NAV_TITLES: Readonly<Record<string, string>> = {
  'market-status': 'MarketStatus',
  'metric-tile': 'MetricTile',
  'share-bars': 'ShareBar',
  'meter-range': 'MeterBar',
  'headline-figure': 'HeadlineFigure',
  'key-stats': 'KeyStats',
  'split-bars': 'SplitBar',
  'data-table': 'DataTable',
  'empty-skeleton': 'EmptyState',
  'check-list': 'CheckList',
  figure: 'Figure',
  tooltip: 'Tooltip',
  'page-layout': 'Page layout',
  rows: 'Rows',
  'price-limit': 'PriceLimit',
};
