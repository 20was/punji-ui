// Showcase: real product screens built only from @punji/ui exports plus a small layout stylesheet each.
// They are patterns to copy, not package API: nothing here is exported by the package. Kept apart from
// registry.ts so it merges cleanly with component pages added in parallel. Pure data (no JSX).
//
// Each page has one example, site/src/examples/<slug>/screen.tsx, and its layout CSS next to it
// (screen.css). `related` lists the documented component pages the screen is built from ("Built from").
// URLs are /showcase/<slug>/ (seo.ts). Old portal pages that now have a showcase home redirect here
// (PORTAL_RENAMES in seo.ts).
import type { PageDef } from './registry.ts';

const screen = (title: string, note: string) => [{ id: 'screen', title, note }] as const;

/** Shared by every pattern: what the copy leaves to the app. */
const YOURS = {
  data: 'Data and its freshness: the screen reads the site’s synthetic fixtures; wire your own queries or socket and say how old the figures are.',
  routes: 'Routing, authentication and permissions: buttons here change local state only.',
};

export const SHOWCASE_PAGES: readonly PageDef[] = [
  {
    slug: 'app-header',
    title: 'App header',
    lead: 'An account’s top bar: sections, company search, the NEPSE mark, the inbox and the account, over the index strip and the title row.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A trading account’s top bar built from Punji UI: section links, company search, the NEPSE market mark, inbox and avatar, with the index strip.',
    summary:
      'The bar every signed-in screen starts with. The brand and the section links sit on the left, company search in the middle and the market mark, the inbox and the account on the right; under it the index strip and the page’s title row with its freshness note and actions. Under 760 px the sections move into the package Drawer and search takes its own row.',
    use: [
      'Replace the section buttons with your router’s links (Button takes `href` and a `linkComponent`), keeping `aria-current="page"` on the current one.',
      'Keep the market mark derived from a schedule you maintain: `getMarketSession(now, schedule)` with your holidays.',
      'Point CompanySearch’s `onOpen` at the company route.',
    ],
    avoid: [YOURS.routes, 'The brand mark: the wordmark here is plain text; use your own logo.', YOURS.data],
    api: [],
    examples: screen('App header', 'Sections, search and inbox are live; narrow the preview to see the drawer.'),
    keyboard: [
      'Tab moves through Menu (narrow), the sections, search, the inbox and the title row actions in reading order.',
      'CompanySearch: arrow keys move through suggestions, Enter opens one, Escape closes the list.',
      'The Drawer traps focus while open and Escape closes it.',
    ],
    accessibility: [
      'The sections are a named `nav` landmark; the current one carries `aria-current="page"`.',
      'The inbox button is icon-only with a spoken label that includes the unread count.',
      'The market state is words (Pre-open, Open, Closed), not a coloured dot alone.',
    ],
    responsive: [
      'Container queries, not viewport queries: the bar adapts to the space it is given.',
      'Under 960 px search takes its own row; under 760 px the sections fold into the drawer behind Menu.',
    ],
    related: ['company-search', 'market-status', 'market-indices', 'drawer', 'button', 'status-pill'],
  },
  {
    slug: 'app-band',
    title: 'App band',
    lead: 'A mobile-app promotion band: what the phone does best, the download actions and two app screens drawn with real components.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A mobile-app promotion band built from Punji UI: feature rows, download actions and two phone screens drawn with the same portfolio components.',
    summary:
      'The band a public page uses to send people to the app (the portal called it the app strip). The copy, three feature rows and two download actions sit beside two phone screens; the screens are drawn with the portfolio and watchlist components the app itself uses, so the picture cannot drift from the product. The band forces the dark theme on its own subtree with `data-theme="dark"`, so it reads the same on a light or a dark page.',
    use: [
      'Swap the two Buttons for the official store badges your licence allows, keeping one action per store.',
      'Feed the phone screens the same fixtures as your screenshots; they are inert, so nothing in them takes focus.',
      'Drop `data-theme="dark"` to let the band follow the page theme.',
    ],
    avoid: [
      'Store badges and links: the stores’ artwork and rules are theirs to grant; the buttons here are placeholders.',
      'Phone frames as product photography: they are CSS boxes around live components.',
      YOURS.data,
    ],
    api: [],
    examples: screen('App band', 'Two phone screens drawn with live components, inert inside the frames.'),
    keyboard: ['Tab reaches only the two download actions; the phone screens are inert pictures.'],
    accessibility: [
      'Each phone is a `figure` with a caption saying what the screen shows; its contents are `inert`, so a screen reader is not walked through a picture.',
      'The feature rows are a labelled list of CheckRows with words, not icons alone.',
    ],
    responsive: ['Under 620 px one phone shows; from 620 px the second sits beside it, set lower; from 900 px copy and phones sit side by side.'],
    related: ['check-list', 'button', 'rows', 'watchlist', 'sparkline', 'market-status'],
  },
  {
    slug: 'portfolio-tracker',
    title: 'Portfolio tracker',
    lead: 'A portfolio screen: totals, performance against NEPSE, sector allocation and a sortable holdings table, all from one exact summary.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A NEPSE portfolio tracker built from Punji UI: overview totals, performance against NEPSE, sector allocation and a sortable holdings table with CSV.',
    summary:
      'Your trades and today’s quotes go in; `positionsFromTransactions` and `holdingsSummary` give exact bigint positions and totals; every panel reads that one summary. The overview says when a figure is incomplete (one holding has no price, one has no previous close) instead of showing zero.',
    use: [
      'Keep the summary in one place (a query or a store) and pass it down; the panels never compute money themselves.',
      'Add or hide holdings columns with `useColumnVisibility`; sorting stays in your state.',
      'Slice the dates and every series to the same range when the period changes.',
    ],
    avoid: [YOURS.data, 'Tax, broker fees and corporate actions you have not recorded: the summary is exactly what your transactions say.', YOURS.routes],
    api: [],
    examples: screen('Portfolio tracker', 'Sort the holdings, switch the chart period, export the table.'),
    keyboard: [
      'Column headers are sort buttons; Enter or Space sorts.',
      'The chart’s period control is a SegmentedControl: arrow keys move between periods.',
      'Arrow keys move the chart crosshair when the chart has focus.',
    ],
    accessibility: [
      'Every chart has a text label and a data table for screen readers.',
      'Gains and losses carry a sign and words as well as colour.',
      'Incomplete totals are explained in words under the overview.',
    ],
    responsive: [
      'From 880 px the chart and the allocation sit side by side; narrower, they stack.',
      'The holdings table scrolls sideways inside its card on a phone, with the symbol column kept in view.',
    ],
    related: ['portfolio-overview', 'performance-chart', 'portfolio-allocation', 'holdings-table', 'segmented-control', 'card'],
  },
  {
    slug: 'market-board',
    title: 'Live market board',
    navTitle: 'Market board',
    lead: 'A live NEPSE board: indices, breadth, a turnover heatmap, live prices and movers, all fed from one array of quotes.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A live NEPSE market board built from Punji UI: indices, breadth, turnover heatmap, a live price table and movers, all fed from one array of quotes.',
    summary:
      'A market overview that stays in step because every panel reads the same quotes. "Receive a tick" stands in for your socket: it hands the panels new props, the table flashes the cells that changed and breadth, turnover, the heatmap and the movers follow. Nothing animates under reduced motion.',
    use: [
      'Replace the tick button with your socket or polling query; keep the quotes in one store and pass the array down.',
      'Derive the market state from your schedule with `getMarketSession`, with holidays you maintain.',
      'Pick the heatmap’s size measure (turnover or volume) to match the board’s sort.',
    ],
    avoid: [YOURS.data, 'Exchange rules: circuit limits, halts and holidays come from the exchange, not the components.', 'Order entry: the board is read-only.'],
    api: [],
    examples: screen('Live market board', 'Press Receive a tick to push new prices through every panel.'),
    keyboard: [
      'Table headers sort; the movers tabs follow the tabs pattern (arrow keys).',
      'Heatmap tiles are not focusable here (no onSelect); give it onSelect to make each tile a button.',
    ],
    accessibility: [
      'Live cells change without stealing focus; flashes are a tint plus the new value, never colour alone.',
      'The breadth bar prints its counts in words under the bar.',
      'A missing index value is announced as no value, not zero.',
    ],
    responsive: ['From 940 px the price table and movers sit side by side; from 760 px breadth and the heatmap do.', 'The index cards wrap; the table scrolls inside its card.'],
    related: ['market-indices', 'market-status', 'split-bars', 'market-heatmap', 'stock-table', 'market-movers', 'key-stats'],
  },
  {
    slug: 'watchlist-alerts',
    title: 'Watchlist and alerts',
    navTitle: 'Watchlist',
    lead: 'A watchlist you can add to, reorder and prune, with a panel for the chosen company: quote, circuit band and price alerts.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A NEPSE watchlist with price alerts built from Punji UI: add with company search, reorder and remove, circuit band and alert distance per company.',
    summary:
      'The list is your state: Watchlist only asks to reorder or remove, CompanySearch asks to add, and choosing a symbol opens its panel. The panel shows the quote, where the price sits inside today’s ±10% band (`circuitLimits`) and each alert with its distance from the last price, computed with `percentageChange`.',
    use: [
      'Persist the list and the alerts on your server; the callbacks only request a change.',
      'Use the exchange’s published limits when you have them, `circuitLimits` only as a fallback.',
      'Send the alert itself from your server; the screen only shows how far each one is.',
    ],
    avoid: [YOURS.data, 'Alert delivery (push, SMS, email) and its rules.', YOURS.routes],
    api: [],
    examples: screen('Watchlist and alerts', 'Add a company, reorder or remove rows, choose a symbol to open its panel.'),
    keyboard: [
      'Each row’s move and remove buttons are focusable; Alt+ArrowUp and Alt+ArrowDown move a row.',
      'The symbol buttons are toggle buttons (`aria-pressed`) that open the panel.',
      'CompanySearch: arrow keys, Enter to add, Escape to close.',
    ],
    accessibility: [
      'Rose, fell and unchanged are counted in words beside the bar.',
      'Alert state is a word (Waiting, Triggered) with a tone, never colour alone.',
      'The circuit band names its limits and the price’s position in text.',
    ],
    responsive: ['From 820 px the list and the panel sit side by side; narrower, the panel follows the list.'],
    related: ['watchlist', 'company-search', 'price-limit', 'check-list', 'split-bars', 'price-change'],
  },
  {
    slug: 'stock-detail',
    title: 'Stock detail',
    lead: 'A company page: the quote, daily candles with volume and averages, the circuit band, the order book and its depth.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A NEPSE stock page built from Punji UI: quote, candlestick chart with volume, session stats, circuit band, order book and depth chart, light and dark.',
    summary:
      'Everything a reader checks before acting on one company. The quote is exact bigint paisa; the candles and book levels are display numbers in rupees. The chart period is your state: slice the candles and the session range follows. The order book carries a Delayed pill because a free feed usually is; say what yours is.',
    use: [
      'Keep the quote and the candles from the same source and timestamp, and say when it was.',
      'Replace the fundamentals with your published data; a missing value reads as Not published, never zero.',
      'Pass the exchange’s circuit limits when you have them.',
    ],
    avoid: [YOURS.data, 'Order entry and broker routing: the page is read-only.', 'Fundamentals: the figures shown are illustrative.'],
    api: [],
    examples: screen('Stock detail', 'Switch the chart period; arrow keys move the chart crosshair.'),
    keyboard: [
      'The chart takes focus; arrow keys move the crosshair across sessions.',
      'The period control is a SegmentedControl (arrow keys).',
      'Watch is a toggle button (`aria-pressed`).',
    ],
    accessibility: [
      'The candlestick and depth charts each have a label and a data table for screen readers.',
      'The order book is a real table with a caption; bar lengths repeat the quantities in text.',
      'Direction is carried by sign and arrow shape as well as colour.',
    ],
    responsive: [
      'From 980 px the chart column and the book column sit side by side; from 720 px the quote sits beside the name.',
      'The session strip wraps onto two rows on a phone.',
    ],
    related: ['candlestick-chart', 'order-book', 'depth-chart', 'price-limit', 'key-stats', 'market-status', 'price-change'],
  },
  {
    slug: 'invoice',
    title: 'Invoice',
    lead: 'A VAT invoice: lines, discount, 13% VAT computed exactly, payments received and the balance due, with BS and AD dates.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A Nepal VAT invoice built from Punji UI: line items, trade discount, exact 13% VAT, payments received and balance due, with BS and AD dates.',
    summary:
      'Every amount is bigint paisa. Line totals are quantity times rate; the discount and VAT are `applyRate` with half-up rounding; the balance is the total less the payments recorded. Dates show Bikram Sambat first with the AD date under it. The sheet prints on its own (the action bar and the side panel hide in print).',
    use: [
      'Take the VAT rate and rounding from your tax configuration, not from the screen.',
      'Keep invoice numbers and PAN from your records; they are plain text here.',
      'Generate the PDF on the server from the same data; the Download button is a placeholder.',
    ],
    avoid: ['Tax rules: 13% VAT and half-up rounding are illustrative; confirm the rules that apply to you.', 'Numbering, PAN validation and storage.', YOURS.routes],
    api: [],
    examples: screen('Invoice', 'Amounts are exact bigint paisa; the sheet prints alone.'),
    keyboard: ['Only the actions are focusable; the invoice is a document.'],
    accessibility: [
      'The invoice is an `article` with a name; the lines are a table with a caption and row headers.',
      'Discount is marked with a minus sign in text, not only a tone.',
      'The paid share is a meter with its percentage in words.',
    ],
    responsive: [
      'From 900 px the payment panel sits beside the sheet; narrower, it follows it.',
      'Quantity and rate sit under each item, so the line table keeps two columns and fits a phone.',
    ],
    related: ['breakdown', 'financial-calculations', 'data-table', 'payment-status', 'key-stats', 'rows', 'meter-range'],
  },
  {
    slug: 'bank-statement',
    title: 'Bank statement',
    lead: 'An account statement: the account card, opening and closing balances, money in and out, filters, BS or AD dates and a safe CSV.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A bank statement screen built from Punji UI: account card, opening and closing balance, money in and out, search, BS or AD dates and a safe CSV export.',
    summary:
      'The summary is computed from the entries in bigint paisa: money in and out from settled entries, opening and closing balances as the bank stated them. Search, the direction filter and the BS/AD switch only change what the list shows, and the CSV is exactly the rows on screen, with formula text neutralised by `transactionsToCsv`.',
    use: [
      'Fetch the statement for the chosen period on the server; filter on the client only for what is loaded.',
      'Keep the bank’s stated running balance; do not recompute it from a partial list.',
      'Name the file after the account and period.',
    ],
    avoid: [
      'Bank integrations, statement periods and PDF statements.',
      'Masking rules beyond the defaults: AccountNumber shows the last four digits and reveals on request.',
      YOURS.data,
    ],
    api: [],
    examples: screen('Bank statement', 'Search, filter by direction, switch BS and AD, download the CSV.'),
    keyboard: ['Search is a labelled field; the filters are SegmentedControls (arrow keys).', 'The balance toggle and account number reveal are buttons with spoken state.'],
    accessibility: [
      'Money in and out carry Cr and Dr words and signs, not colour alone.',
      'Pending, failed and reversed entries show a status in words.',
      'The full account number is not in the page while it is masked.',
    ],
    responsive: ['The summary sits on top; from 900 px the account card sits beside the transactions.', 'The transaction list folds to two lines per entry on a phone.'],
    related: ['bank-account-card', 'transaction-list', 'financial-summary', 'csv-export', 'field', 'segmented-control'],
  },
  {
    slug: 'payment-flow',
    title: 'Payment flow',
    lead: 'Send money in four steps: choose a payee, enter an amount, review, then the receipt with its timeline.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A send-money flow built from Punji UI: beneficiary picker, exact amount entry with balance check, review with fees, receipt and payment timeline.',
    summary:
      'A four-step transfer. The payee comes from BeneficiarySelector, the amount from CurrencyInput as exact minor units (checked against the balance after the fee), the review repeats both parties with masked account numbers, and the receipt and timeline close the flow. Nothing is submitted: Send only moves to the receipt.',
    use: [
      'Confirm the payee, fee and limits on your server before showing the review.',
      'Keep the step in the URL so Back works and a refresh does not lose the form.',
      'Render the receipt from the server’s response, not from the form.',
    ],
    avoid: ['Payment rails, fees, limits and one-time passwords.', 'Fraud and payee checks: the selector only reports a choice.', YOURS.routes],
    api: [],
    examples: screen('Payment flow', 'Pick a payee, change the amount, review and send (nothing is submitted).'),
    keyboard: [
      'BeneficiarySelector: type to filter, arrow keys to move, Enter to choose.',
      'Continue is disabled until the step is valid; errors are announced when they appear.',
      'Back and Continue sit at the end of each step in reading order.',
    ],
    accessibility: [
      'The step list marks the current step with `aria-current="step"`.',
      'The amount error is tied to the field and announced as an alert.',
      'Account numbers stay masked unless revealed.',
    ],
    responsive: [
      'From 820 px the steps and the paying account sit in a column beside the form.',
      'On a phone the steps stack above the form and the account card is left out, so the form stays in the first screen.',
    ],
    related: ['beneficiary-selector', 'currency-input', 'breakdown', 'account-number', 'payment-receipt', 'payment-timeline', 'step-list'],
  },
  {
    slug: 'accounting-dashboard',
    title: 'Accounting dashboard',
    navTitle: 'Accounting',
    lead: 'A small business’s books: key balances, the trial balance, the cash ledger, the income statement and journal entries.',
    group: 'showcase',
    kind: 'showcase',
    description: 'An accounting dashboard built from Punji UI: Nepal fiscal period picker, key balances, trial balance, cash ledger, income statement and journal entries.',
    summary:
      'The figures come from the ledger helpers, exactly: the cash balance from `accountBalance` over the ledger, VAT payable from the posted journals, net profit from the income statement rolled up with `rollUp`. A draft entry that does not balance says so before anyone posts it.',
    use: [
      'Filter entries by the chosen period’s dates on the server; the selector only reports the id.',
      'Post journals only when `isBalanced` is true; show the imbalance otherwise.',
      'Name accounts as your chart of accounts does; the components know no chart.',
    ],
    avoid: ['A chart of accounts, posting rules and period closing.', 'Tax returns: VAT payable here is output less input on the sample journals.', YOURS.data],
    api: [],
    examples: screen('Accounting dashboard', 'Switch reports with the tabs; change the reporting period.'),
    keyboard: ['Tabs: arrow keys move between reports; the panel is focusable.', 'The period selector switches kind and period with standard controls.'],
    accessibility: [
      'Each report is a table with a caption; debit and credit columns are labelled.',
      'An unbalanced draft is announced in words with the difference.',
      'The inverse tile keeps its contrast in both themes.',
    ],
    responsive: [
      'From 960 px the reports and the journals sit side by side.',
      'The four balances wrap two by two on a phone; the report tables scroll sideways inside their cards.',
    ],
    related: ['period-selector', 'metric-tile', 'trial-balance', 'ledger-table', 'statement-table', 'journal-entry', 'tabs'],
  },
  {
    slug: 'dividend-tracker',
    title: 'Dividend tracker',
    navTitle: 'Dividends',
    lead: 'Dividend income by Nepal fiscal year: cash, bonus and rights, yield on cost and on value, upcoming book closures and every payout.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A dividend tracker built from Punji UI: cash, bonus and rights by Nepal fiscal year, yield on cost and value, upcoming book closures and payouts.',
    summary:
      'One transaction history feeds everything: `dividendEntriesFromTransactions` turns it into payouts (bonus shares valued at Rs 100 par, rights at the subscription price) and `dividendsByFiscalYear` groups them by Bikram Sambat fiscal year with yields on cost and on today’s value.',
    use: [
      'Value bonus shares the way your reports do (par, or the price on the listing day) and say which.',
      'Keep upcoming corporate actions from the company’s announcements; they are sample rows here.',
      'Filter the payouts list with its own filters; the chart and totals do not change.',
    ],
    avoid: ['Tax withheld on dividends and its rules.', 'Corporate action data: book closures and AGMs shown are synthetic.', YOURS.data],
    api: [],
    examples: screen('Dividend tracker', 'Totals, yields and the chart all come from one transaction history.'),
    keyboard: ['The payouts filters and pagination are standard controls.', 'The chart is not interactive; its values are in the table under it.'],
    accessibility: [
      'DividendHistory’s chart has a legend in text and the same figures in a table.',
      'Yields are written out with what they are measured against.',
      'Announced and proposed actions are words in pills, not colours alone.',
    ],
    responsive: ['From 860 px the upcoming actions sit beside the headline and totals.', 'Tables stack into labelled rows on a phone.'],
    related: ['dividend-history', 'headline-figure', 'key-stats', 'transaction-history', 'rows'],
  },
  {
    slug: 'ipo-check',
    title: 'IPO result check',
    navTitle: 'IPO check',
    lead: 'Check an IPO allotment by BOID, see open issues and track every application with its blocked and released amounts.',
    group: 'showcase',
    kind: 'showcase',
    description: 'An IPO allotment check built from Punji UI: issue and BOID form with validation, allotment result, open issues and applications with refunds.',
    summary:
      'The form validates a 16-digit BOID before anything is sent and says what is wrong in words. The result is announced politely and repeats the BOID masked. Below, every application shows units applied and allotted, the amount blocked and its status, and the totals say what has been released back to the bank.',
    use: [
      'Send the check to the registrar’s result service from your server; the result here is a local stand-in.',
      'Keep the issue list from the registrar; it is sample data here.',
      'Show amounts blocked through ASBA exactly, in paisa.',
    ],
    avoid: ['The registrar and bank integrations, and captcha or rate limits they need.', 'Applying: the Apply button is a placeholder for your bank’s flow.', YOURS.data],
    api: [],
    examples: screen('IPO result check', 'Try a BOID ending in an odd digit (allotted) or an even one (not allotted).'),
    keyboard: ['The form submits with Enter from the BOID field.', 'The issue Select opens with Enter or Space and moves with arrow keys.'],
    accessibility: [
      'The BOID error is tied to the field and announced.',
      'The result is in a polite live region with a role of status.',
      'Allotted, not allotted and pending are words in pills.',
    ],
    responsive: [
      'From 820 px the check and the open issues sit side by side.',
      'The applications table keeps two columns (amounts under the issue, status under the units), so it fits a phone.',
    ],
    related: ['field', 'select', 'inline-state', 'metric-tile', 'data-table', 'status-pill'],
  },
  {
    slug: 'mobile-account-home',
    title: 'Mobile account home',
    navTitle: 'Mobile home',
    lead: 'A phone home screen: the balance with a hide toggle, quick actions, the portfolio at a glance, recent transactions and the tab bar.',
    group: 'showcase',
    kind: 'showcase',
    description: 'A mobile banking and brokerage home screen built from Punji UI: hidden-by-choice balance, quick actions, portfolio glance, recent transactions, tab bar.',
    summary:
      'Designed at 390 px and kept to a phone-width column on wide screens. The account card hides the balance on request; the quick actions are full-width Buttons laid out as tiles; the holdings are ValueRows inside one GroupedCell; recent transactions show Bikram Sambat dates; the bottom tab bar is a named navigation with the current section marked.',
    use: [
      'Remember the balance-hidden choice per device; start hidden on a shared device.',
      'Point the holdings rows at your company route (`href`).',
      'Keep the tab bar to four or five sections with words, not icons alone.',
    ],
    avoid: ['Biometric unlock, session timeouts and device binding.', 'The quick actions’ destinations.', YOURS.data],
    api: [],
    examples: screen('Mobile account home', 'Hide the balance, open a holding, switch tabs.'),
    keyboard: [
      'Tab order follows the screen: greeting, notifications, account card, actions, portfolio rows, transactions, tab bar.',
      'Holding rows are links; the tab bar items are buttons with `aria-current`.',
    ],
    accessibility: [
      'The balance toggle says whether the balance is shown; hidden amounts are not read out.',
      'Every quick action has a visible word beside its icon.',
      'Tap targets are at least 44 px.',
    ],
    responsive: ['A single column at every width; the quick actions go four across from 360 px.'],
    related: ['bank-account-card', 'rows', 'transaction-list', 'sparkline', 'button', 'figure'],
  },
];
