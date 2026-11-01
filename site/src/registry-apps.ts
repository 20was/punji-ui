// Apps: complete, interactive dashboards at /apps/<slug>/, built only from @punji/ui exports on a simulated market.
// Each app is site/src/apps/<slug>/App.tsx (default export); the page frame (bar, About) comes from AppView.tsx.
// Kept apart from registry.ts so it merges cleanly. Pure data (no JSX). See site/README.md, "Add an app".
import type { PageDef } from './registry.ts';

export const APP_PAGES: readonly PageDef[] = [
  {
    slug: 'trading-terminal',
    title: 'Trading terminal',
    description:
      'A complete NEPSE trading terminal built from Punji UI: live market watch, candles, depth and order book, an order ticket that fills orders, positions and P&L.',
    lead: 'A TMS-class terminal on a simulated session: watch, chart, place, fill, and see the P&L move, all from documented components.',
    group: 'apps',
    kind: 'app',
    summary:
      'A trading terminal of the kind a NEPSE broker\'s TMS offers, running on a simulated session. Quotes tick every 1.5 seconds; an order you place on the ticket goes into the order book, fills in lots when the market reaches your limit, pays exact NEPSE fees, moves your cash and changes your position. Every screen reads one account state, so the cash on Positions, the buying power on the ticket and the fills in the trade book agree to the paisa.',
    use: [
      'Replace `site/src/apps/shared/sim.ts` with your broker\'s feed: the screens read `Quote` objects with bigint paisa, the same shape `StockTable` takes.',
      'Send `onSubmit` from `OrderTicket` to your order API instead of the reducer; map your order statuses to `TradingOrder`.',
      'Keep the fee schedule current: `estimateNepseTrade` reads `nepseFeeSchedule`, an example to verify against SEBON notices.',
    ],
    avoid: [
      'Authentication, the broker connection, collateral rules and risk checks: the reducer only checks buying power and holdings.',
      'Order types beyond a day limit order (stop, IOC) and the exchange\'s own matching: fills here are a seeded simulation.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `5` open the screens; `B` and `S` open the ticket on the selected scrip as a buy or a sell; `P` pauses and resumes the live prices.',
      '`/`, `Ctrl+K` or `⌘K` (and `?`) open the command palette: type a symbol, a screen or a command; Left and Right choose between a scrip\'s actions (Chart, Buy, Sell, Watch); Enter runs it, Esc closes.',
      'Plain keys never fire while you type in a field. The order ticket steps quantity in lots and price in ticks with the arrow keys; the split pane\'s separator moves with the arrow keys, Home and End.',
    ],
    accessibility: [
      'Each screen has its own `h2`; opening one from the navigation moves focus to it. The navigation marks the current screen with `aria-current`.',
      'Fills, rejections and cancellations are announced in a polite live region; a circuit-breaker halt is an alert. Direction is never colour alone: signs, arrows and words.',
      'Live prices honour reduced motion (no count-up or flash) and can be paused.',
    ],
    responsive: [
      'Wide screens: a navigation rail, the quote table beside the selected scrip, and the chart and ticket in a resizable split pane.',
      'Phones and tablets: a bottom tab bar, tables become stacked rows, and the split pane stacks the chart above the ticket.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'Synthetic scrips and prices; the session starts at 12:00 on 1 November 2026 and five simulated seconds pass per tick.',
        'Capital gains tax on a sell uses the long-term rate for positions carried from earlier sessions and the short-term rate for today\'s buys.',
        'The circuit breaker is a demo control (Commands, "Trip the index circuit breaker"): it marks every scrip down about 4.3% and pauses trading for 15 simulated minutes.',
      ],
    },
    related: ['stock-table', 'order-ticket', 'order-list', 'nepse-fees', 'candlestick-chart', 'depth-chart', 'order-book', 'price-limit', 'market-status', 'trading-halt', 'holdings-table', 'portfolio-overview', 'metric-tile', 'command-palette', 'split-pane', 'hooks'],
    app: {
      screens: [
        { id: 'watch', title: 'Market watch', summary: 'The index, turnover and breadth, every scrip ticking live in a sortable `StockTable`, filters for the watchlist, gainers and losers, and the selected scrip with Buy and Sell.' },
        { id: 'symbol', title: 'Chart and ticket', summary: 'One scrip: daily candles with today\'s live candle, depth, the order book and the circuit band, with the `OrderTicket` in a resizable `SplitPane`.' },
        { id: 'orders', title: 'Orders', summary: 'Today\'s orders in an `OrderList` (fill progress, Modify, Cancel with a confirm) beside a ticket with a scrip picker.' },
        { id: 'positions', title: 'Positions', summary: 'Positions marked to the live prices: `PortfolioOverview`, cash, money held for orders, fees and tax paid, and a `HoldingsTable` with CSV export.' },
        { id: 'trades', title: 'Trades', summary: 'The trade book (`TradeList`): every fill with its exact amount and counterparty broker, bought and sold totals, and a CSV of the book.' },
      ],
      data:
        'A seeded generator (`site/src/apps/shared/sim.ts`) moves 16 synthetic scrips a few price steps at a time inside their ±10% band. The same seed gives the same prices on the server and in the browser, so the page prerenders the opening state and the clock starts after hydration. Nothing is fetched.',
    },
  },
  {
    slug: 'wealth-dashboard',
    title: 'Wealth dashboard',
    description:
      'A personal wealth dashboard built from Punji UI: net worth, allocation, live holdings, dividends by fiscal year, an IPO centre with allotment, goals and CSV.',
    lead: 'Net worth to the paisa, holdings at live prices, dividends, share issues from application to allotment, and savings goals.',
    group: 'apps',
    kind: 'app',
    summary:
      'The investor\'s side: everything one person owns, on the same simulated market as the trading terminal. Holdings, P&L, dividends and the allocation are computed from one transaction history with `holdingsSummary`, so the net worth on the overview, the totals row of Holdings and the yields on Dividends agree. Applying for an IPO blocks the amount in the bank; checking the allotment adds the allotted shares to Holdings and unblocks the rest, and net worth follows.',
    use: [
      'Feed `transactions` from your own records (or the CDSC MeroShare export) as `PortfolioTransaction`; every screen recomputes from them.',
      'Replace the simulated registrar in `IssuesScreen.tsx` (`onCheck`) with your allotment API, and `onSubmit` of `ApplyIssueForm` with your ASBA application call.',
      'Keep goals in your backend; the screen only needs the target, the saved amount, the monthly plan and the due date.',
    ],
    avoid: [
      'Bank and demat connections, authentication and the PIN check: the form hands you the PIN and you send it straight to your server.',
      'Tax lots, multi-currency assets and liabilities: net worth here is shares, savings, money blocked for applications and fixed deposits.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `6` open the screens; `P` pauses and resumes the live prices.',
      'The application form moves between its two steps with Continue and Back; the PIN boxes take digits and Backspace; Esc closes the sheet.',
      'The allotment checker, the transaction filters and the goal form are ordinary forms: Tab, Space and Enter.',
    ],
    accessibility: [
      'Each screen has its own `h2` and focus moves to it from the navigation. Applications, allotments and contributions are announced in a polite live region.',
      'The net-worth bar, the allocation donut and the dividend chart each have their figures in text or a table beside them.',
      'Live prices honour reduced motion and can be paused.',
    ],
    responsive: [
      'Wide screens: a navigation rail and two-column cards. Phones: a bottom tab bar, stacked cards, and tables that become rows.',
      'The application form opens in a sheet that fits the phone width.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'Synthetic companies, prices and accounts. The session date is 1 November 2026; dividends and goals are dated around it.',
        'The registrar is a seeded draw: the same BOID and issue always get the same answer, about half receive 10 kitta. An allotted IPO has no market price until it lists, so it counts at cost in net worth and the totals name it as unpriced.',
        'Bonus shares are valued at par (Rs 100) on Dividends, as `dividendEntriesFromTransactions` does by default.',
      ],
    },
    related: ['portfolio-overview', 'portfolio-allocation', 'holdings-table', 'transaction-history', 'dividend-history', 'issue-card', 'apply-issue-form', 'allotment-checker', 'corporate-action-timeline', 'share-issue-helpers', 'share-bars', 'meter-range', 'currency-input', 'sheet', 'virtual-table', 'hooks'],
    app: {
      screens: [
        { id: 'overview', title: 'Overview', summary: 'Net worth with a bar of where it sits, the share portfolio\'s headline (`PortfolioOverview`), allocation by sector and what is coming up.' },
        { id: 'holdings', title: 'Holdings', summary: 'A `HoldingsTable` at live prices with totals and CSV, then the full `TransactionHistory` with filters and a CSV of the ledger (`TableExport`).' },
        { id: 'dividends', title: 'Dividends', summary: 'Cash, bonus and rights per Bikram Sambat fiscal year (`DividendHistory`) with yields on value and on cost.' },
        { id: 'issues', title: 'IPO centre', summary: 'Open, upcoming and closed issues (`IssueList`), the two-step `ApplyIssueForm` in a sheet, your applications, and the `AllotmentChecker` that settles them.' },
        { id: 'actions', title: 'Corporate actions', summary: 'Book closes, AGMs, rights windows and distributions for the scrips you hold (`CorporateActionTimeline`).' },
        { id: 'goals', title: 'Goals', summary: 'Savings goals with progress, whether the monthly plan reaches each in time, and a contribution form with `CurrencyInput`.' },
      ],
      data:
        'The same seeded market as the trading terminal (`site/src/apps/shared/sim.ts`), ticking every two seconds after hydration, and a fixed three-year transaction history. Nothing is fetched; the registrar and the bank are simulated in the screens.',
    },
  },
  {
    slug: 'accounting',
    title: 'Accounting',
    description:
      'A double-entry accounting app built from Punji UI: ledger, journals, trial balance, P&L and balance sheet by BS fiscal year, bank reconciliation, aging and TDS.',
    lead: 'Books for a Nepali company in the browser: every report reads one set of balanced journals, so totals agree to the paisa.',
    group: 'apps',
    kind: 'app',
    summary:
      'The accountant\'s side of a Nepali services company, from the opening balances on 1 Shrawan 2082 to 15 Kartik 2083: invoices with 13% VAT, receipts net of the TDS customers withhold, contractor bills, rent with 10% TDS, monthly payroll with SSF and CIT, and the VAT, TDS and SSF deposits on the 25th. Every screen reads the same journals, so the dashboard, the general ledger, the trial balance, the statements, the aging and the TDS summary agree to the paisa; post a journal or book a bank charge and they all move. Periods are Bikram Sambat fiscal years, quarters and months.',
    use: [
      'Feed `journals` from your own books as `JournalEntry` objects (bigint paisa, date-only dates): the ledger, trial balance and statements are computed from them with `journalsToEntries`, `trialBalance` and `rollUp`.',
      'Keep your chart of accounts in the shape of `site/src/apps/accounting/books.ts`: a code, a name, a type and a normal side. The statements group accounts by type, so a new account appears without code changes.',
      'Replace the generated bank statement with your bank\'s file mapped to `ReconcileItem`, and send matches and booked entries to your server.',
    ],
    avoid: [
      'Authentication, users and audit trails, period locking, and the year-end closing entry: the balance sheet shows this year\'s profit beside what was brought forward instead.',
      'Filing: the VAT and TDS figures are the working for a return, not the return itself, and the server that keeps the books must validate every journal again.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `9` open the screens. Plain keys never fire while you type in a field.',
      'Journal entry: Tab moves through account, debit and credit, line by line; "Fill the difference" balances the last line; Ctrl+Enter or ⌘Enter posts, and so does Enter in a field.',
      'Bank reconciliation: Space ticks a line and Ctrl+Enter or ⌘Enter matches the ticked lines; each list scrolls with the arrow keys once focused.',
    ],
    accessibility: [
      'Each screen has its own `h2` and focus moves to it from the navigation. Posting, booking and matching are announced in a polite live region.',
      'Tables have real headers and captions, and scrolling regions take focus. Out of balance is said in words with the amount, never colour alone.',
      'The monthly chart has its figures in a data table beside it.',
    ],
    responsive: [
      'Desktop first: a navigation rail, the chart of accounts beside the ledger, and the two reconciliation lists side by side.',
      'Phones: a bottom tab bar with nine short labels, tables that stack into labelled rows or scroll inside their own region, and journal lines as small cards. Nothing scrolls the page sideways at 390 px.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'An invented company, customers and amounts. The session date is 15 Kartik 2083 (1 November 2026).',
        'Tax rates and slabs are examples in the shape of FY 2083/84; check the current Finance Act. No income tax provision or year-end close is posted.',
        'The bank statement is made from the books with known differences: one payroll paid as five transfers, a cheque not yet presented, a receipt in transit and two bank charges.',
      ],
    },
    related: ['ledger-table', 'journal-entry', 'trial-balance', 'statement-table', 'period-selector', 'financial-summary', 'reconciliation-matcher', 'aging-table', 'tds-summary', 'debit-credit', 'metric-tile', 'column-chart', 'csv-export', 'tax-helpers', 'business'],
    app: {
      screens: [
        { id: 'dashboard', title: 'Dashboard', summary: 'Cash, receivables, payables and profit (`MetricRow`), income and expenses by BS month, what is due to the IRD and the SSF on the 25th, and checks that the books agree with themselves.' },
        { id: 'ledger', title: 'Accounts and ledger', summary: 'The chart of accounts with balances and search, one account\'s `LedgerTable` for the period with its opening and running balance, and the journal behind any posting (`JournalEntryView`).' },
        { id: 'journal', title: 'Journal entry', summary: 'A keyboard-first journal: account, debit and credit per line, a live balance check, a preview, and posting only when debits equal credits.' },
        { id: 'trial', title: 'Trial balance', summary: '`TrialBalance` at the end of any period, as balances or totals, in chart order.' },
        { id: 'statements', title: 'P&L and balance sheet', summary: '`StatementTable` for profit and loss and the balance sheet by fiscal year, quarter or month (`FinancialPeriodSelector`), compared with last year or the previous period over the same days.' },
        { id: 'bank', title: 'Bank reconciliation', summary: 'The Ashwin statement against the bank account with `ReconciliationMatcher`: match one-to-one or many-to-one, book the charges the books lack, and read the reconciliation statement.' },
        { id: 'aging', title: 'Receivables and payables', summary: 'Open invoices and bills by party in `AgingTable`, each total tied to its ledger account.' },
        { id: 'tds', title: 'TDS summary', summary: 'Withholding on rent, contract payments and salaries (`TdsSummary`) by category or payment, against the TDS payable account.' },
        { id: 'exports', title: 'Exports', summary: 'Exact CSV of the general ledger, trial balance, statements, receivables, VAT by month and TDS, with a preview.' },
      ],
      data:
        'A seeded generator (`site/src/apps/accounting/books.ts`) writes about 300 balanced journals over sixteen BS months; payroll comes from `site/src/apps/shared/books.ts`, the same module the billing and payroll app runs. The same seed gives the same books on the server and in the browser. Nothing is fetched.',
    },
  },
  {
    slug: 'business',
    title: 'Billing and payroll',
    description:
      'A billing and payroll app built from Punji UI: VAT invoices with PAN and amount in words, customers, payments, a payroll run with SSF and TDS, and payslips.',
    lead: 'Bill a customer, record the payment and pay the staff: IRD-style VAT invoices, exact balances and payslips from one store.',
    group: 'apps',
    kind: 'app',
    summary:
      'The front office of the same company as the accounting app. Write an invoice line by line (`LineItemEditor`), preview it as a printable VAT bill with both PANs, BS and AD dates, 13% VAT and the amount in words (`TaxInvoice`), and issue it. Record payments against invoices; the invoice list, the customer balances and payments received are computed from the same invoices and payments, so the outstanding totals agree to the paisa. The payroll run computes SSF (11% + 20%), CIT and monthly TDS from each employee\'s annual tax with the tax helpers, approves and pays it, and ends in printable payslips; the income tax calculator opens on any employee with their year\'s figures.',
    use: [
      'Send an issued invoice to your server with its lines in paisa; the totals here are `computeInvoice` with `vatRate: \'0.13\'` and half-up rounding, the same call your server should make.',
      'Keep invoice numbers in your own sequence per fiscal year; the app numbers them from `INV-2083/84-0013` on.',
      'Replace the employees and slabs in `site/src/apps/shared/books.ts` with your payroll data; payslip lines are plain `PayLine` objects.',
    ],
    avoid: [
      'IRD electronic billing (CBMS) submission, cancellation with credit notes and fiscal-year rollover: the app only issues and records.',
      'Leave, attendance, overtime and bonus. Tax slabs, caps and rebates are your data for the year.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `6` open the screens; `N` starts a new invoice. Plain keys never fire while you type.',
      'The line editor: Tab through description, quantity, rate and VAT; Add line focuses the new description. Preview and Back move between writing and the bill; Print prints the bill alone.',
      'Payment and customer forms are ordinary forms: Tab, Space and Enter. The payroll run moves through Review, Approve and Pay with buttons, and each step says what it did.',
    ],
    accessibility: [
      'Each screen has its own `h2` and focus moves to it from the navigation. Issuing, payments and payroll steps are announced in a polite live region.',
      'Invoice status is a word (Paid, Part paid, Overdue, Due), not a colour. Form errors are tied to their fields and announced.',
      'The invoice and payslips print on their own, without the app around them.',
    ],
    responsive: [
      'Wide screens: a navigation rail, the invoice list with every column, the bill at full width.',
      'Phones: a bottom tab bar, lists that stack into labelled rows, and the invoice and payslips fitted to the width, with no sideways page scroll at 390 px.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'An invented company, customers and staff; the session date is 15 Kartik 2083 (1 November 2026) and the payroll month is Kartik 2083.',
        'Income tax uses example slabs in the shape of FY 2083/84, SSF contributors are exempt from the 1% band, and retirement contributions are capped at 5 lakh and one third of income. Check the current Finance Act.',
        'TDS a customer withholds on a receipt is recorded on the payment and settles the invoice like cash.',
      ],
    },
    related: ['tax-invoice', 'line-item-editor', 'pan-input', 'payslip', 'income-tax-calculator', 'tax-helpers', 'currency-input', 'data-table', 'financial-summary', 'metric-tile', 'csv-export', 'accounting'],
    app: {
      screens: [
        { id: 'invoices', title: 'Invoices', summary: 'Every invoice with its total, what was received and what is outstanding, a status in words, search and filters, totals, and the bill itself on demand.' },
        { id: 'create', title: 'New invoice', summary: 'Customer, date and terms, `LineItemEditor` with exact totals, then a `TaxInvoice` preview (PAN, 13% VAT, amount in words, BS and AD dates, print) and Issue.' },
        { id: 'customers', title: 'Customers', summary: 'Customers with PAN, terms and outstanding balance, and a form to add one with `PanInput`.' },
        { id: 'payments', title: 'Payments received', summary: 'Record a receipt against an open invoice (cash, cheque, bank transfer, QR) with any TDS the customer withheld, and the list of receipts with totals.' },
        { id: 'payroll', title: 'Payroll', summary: 'Kartik 2083: gross, SSF, CIT, TDS and net per employee with totals; review, approve and pay; then a `Payslip` for each person.' },
        { id: 'tax', title: 'Income tax', summary: 'The `IncomeTaxCalculator` opened on an employee\'s year, showing that one twelfth of the tax is the TDS on their payslip.' },
      ],
      data:
        'Customers, staff and payroll come from `site/src/apps/shared/books.ts`, shared with the accounting app; a dozen earlier invoices and payments are seeded in `site/src/apps/business/store.ts`. Nothing is fetched.',
    },
  },
];
