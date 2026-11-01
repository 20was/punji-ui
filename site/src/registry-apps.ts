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
  {
    slug: 'retail-banking',
    title: 'Retail banking',
    description:
      'A mobile-first retail banking app built from Punji UI: balances, statements in BS and AD, a transfer with payee check and OTP, cards, loans, deposits and KYC.',
    lead: 'A bank app of the Monzo and Nabil class: see your money, send it safely, control your cards, and keep your KYC current.',
    group: 'apps',
    kind: 'app',
    summary:
      'A retail bank\'s app, phone first, on a simulated customer. Three accounts with three months of statements; a transfer that checks the payee\'s name with the receiving bank, says the amount in words, asks for a one-time code and prints a receipt; cards you can freeze, limit, block and replace; a home loan with its exact schedule and an early EMI; fixed deposits; a KYC update with the Nepal address picker and document upload; and notifications. One reducer holds the money, so the balance on Home, the statement\'s running balance, the receipt and the notification agree to the paisa.',
    use: [
      'Replace the reducer\'s actions with your core banking API: `transfer`, `card-status`, `pay-emi`, `open-fd` and `kyc-submit` are the calls a bank makes; keep the screens.',
      'Feed `PayeeVerification` the answer from your Confirmation of Payee or ConnectIPS name lookup, and record the acknowledgement with the payment.',
      'Send the OTP from your server and check it there; the demo accepts 246810 so the flow can be tried.',
    ],
    avoid: [
      'Authentication, device binding, session timeouts and fraud scoring: the app starts signed in.',
      'The fee schedule and limits: ConnectIPS-style fees and a Rs 10 lakh daily limit are illustrations, not any bank\'s tariff.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `7` open the screens; `H` hides and shows balances.',
      'The payee picker is a combobox (arrows, Enter, Escape); the code boxes take digits, Backspace and paste; segmented controls move with the arrow keys.',
      'Every money action has a confirm step you reach with Tab and Enter: Review, then the code, for a transfer; an inline confirm to unfreeze or block a card, pay an EMI or open a deposit.',
    ],
    accessibility: [
      'Each screen has its own `h2` and focus moves to it from the navigation; each transfer step moves focus to its heading. What the app did is announced in a polite live region.',
      'Account and card numbers are masked and spoken as "ending in"; "Hide balances" replaces every figure with dots and the word hidden.',
      'The payee check is a live region; statuses are words and icons, never colour alone.',
    ],
    responsive: [
      'Designed at 390 px: quick actions in a 3 by 2 grid, stacked cards and a bottom tab bar. Tablets and desktops get a navigation rail and two columns.',
      'Print or Save as PDF from the statement drops the app chrome and prints every entry.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'Punji Bank and every name, number and balance are invented. The session is 1 November 2026 (15 Kartik 2083), 10:30 Kathmandu time.',
        '"Offline (demo)" makes the bank unreachable: statements fail with a retry and nothing that moves money goes through.',
        'The OTP is shown on screen for the demo. A real bank never shows it, and limits tries on its server.',
      ],
    },
    related: ['bank-account-card', 'transaction-list', 'statement-table', 'beneficiary-selector', 'transfer-review', 'payee-verification', 'currency-input', 'otp-input', 'payment-receipt', 'payment-timeline', 'account-number', 'loan-calculator', 'amortisation-table', 'deposit-calculator', 'interest-rate-table', 'onboarding-wizard', 'nepal-address-picker', 'id-number-input', 'document-upload'],
    app: {
      screens: [
        { id: 'home', title: 'Home', summary: 'The total and each account (`BankAccountCard`) with hide-balance, six quick actions, the latest entries and what is coming up: the EMI, a deposit maturing, KYC.' },
        { id: 'accounts', title: 'Accounts', summary: 'A statement per account: search, money in or out, period, BS or AD dates (`TransactionList`), a monthly summary by category (`StatementTable`), CSV and a printable view.' },
        { id: 'transfer', title: 'Transfer', summary: 'A saved payee (`BeneficiarySelector`) or a new account, `CurrencyInput` with fee and limits, a `TransferReview` with `PayeeVerification` and the amount in words, an `OtpInput` step, then `PaymentReceipt` and `PaymentTimeline`.' },
        { id: 'cards', title: 'Cards', summary: 'Debit and virtual cards with a masked `AccountNumber`: freeze, block and replace, online, international and contactless switches, and daily limits.' },
        { id: 'loans', title: 'Loans and deposits', summary: 'The home loan with its `AmortisationTable` and an early EMI, a `LoanCalculator`, fixed deposits with `DepositCalculator`, and the `InterestRateTable`.' },
        { id: 'profile', title: 'Profile and KYC', summary: 'The KYC update in an `OnboardingWizard`: `IdNumberInput` for citizenship and PAN, `NepalAddressPicker`, `DocumentUpload`, review and consent.' },
        { id: 'alerts', title: 'Notifications', summary: 'Money, security, reminders and offers, with unread markers, filters and Mark all read.' },
      ],
      data:
        'A fixed seed builds three months of statements (salary, rent, bills, EMIs, card spends, a failed transfer, quarterly interest and TDS). The loan schedule comes from `amortise`, the same function the statement\'s EMI lines use. Nothing is fetched; the receiving banks, the SMS gateway and the KYC desk are simulated.',
    },
  },
  {
    slug: 'digital-wallet',
    title: 'Digital wallet',
    description:
      'An eSewa and Khalti class digital wallet built from Punji UI: balance and load money, scan and pay EMVCo QR, send to mobile with a PIN, bills, top-up, rewards.',
    lead: 'A Nepali wallet done properly: load, scan, send, pay bills and top up, each confirmed with a PIN that never reaches the page.',
    group: 'apps',
    kind: 'app',
    summary:
      'A digital wallet of the eSewa and Khalti kind, phone first. Load money from a linked bank; scan a merchant\'s NepalPay-style QR (paste a payload or pick a sample) and see the merchant and amount the code carries before you pay; send money to a mobile number; pay electricity, water and internet bills and top up a phone; follow every payment\'s timeline; and earn and redeem cashback. Every payment is confirmed with a `PinPad` whose digits are never written to the page. One reducer holds the balance, so Home, History, the receipt and Rewards agree to the paisa.',
    use: [
      'Swap the reducer\'s actions for your wallet API: `load`, `pay` and `redeem`; each payment carries the PIN for your server to check.',
      'Decode the camera\'s QR text and pass it to `parseMerchantQr`; the screen already handles static and dynamic codes and every parse error.',
      'Replace the simulated billers in `bills.ts` with your biller gateway: the screen needs a lookup that returns the lines for a `BillSummary`.',
    ],
    avoid: [
      'Checking the PIN in the browser: the demo compares it with 2580 so the flow can be tried; your server must check it and count attempts.',
      'The limits and cashback rules: they are illustrations, not Nepal Rastra Bank\'s or any wallet\'s.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `6` open the screens; `H` hides and shows the balance.',
      'The PIN pad and the amount keypad take digit keys and Backspace while focused, and arrow keys move between their keys.',
      'Sample QR codes, billers and plans are buttons and segmented controls: Tab, arrows, Enter and Space.',
    ],
    accessibility: [
      'Each screen has its own `h2`; focus moves to it from the navigation and to each step\'s heading inside a flow. Payments are announced in a polite live region.',
      'The PIN pad announces "2 of 4 digits entered" and nothing else; a wrong PIN is an alert.',
      'Statuses are words and icon shapes; amounts carry their sign and direction in words.',
    ],
    responsive: [
      'Designed at 390 px with a bottom tab bar; wider screens get a navigation rail and the flow beside its summary.',
      'The payment detail opens in a sheet that fits the phone.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'Every merchant, biller, person and number is invented. The session is 1 November 2026, 10:30 Kathmandu time.',
        'The demo PIN is 2580; three wrong PINs lock payments for the session. Sending to 9841000000 is refused as not registered.',
        'A load from the bank settles a few seconds later, and one pending internet payment fails and is refunded, so the timeline shows each outcome.',
      ],
    },
    related: ['payment-qr-card', 'qr-code', 'emvco-qr', 'mobile-number-input', 'amount-keypad', 'pin-pad', 'bill-summary', 'payment-timeline', 'payment-receipt', 'payment-status', 'currency-input', 'payee-verification'],
    app: {
      screens: [
        { id: 'home', title: 'Home', summary: 'The balance with hide, Load money from a linked bank (`AmountKeypad`, then `PinPad`), quick actions, limits used this month and recent activity.' },
        { id: 'scan', title: 'Scan and pay', summary: 'Paste or pick a merchant QR; `parseMerchantQr` reads the merchant, city and amount; enter an amount for a static code; pay with the PIN. Your own receive code in a `PaymentQrCard`.' },
        { id: 'send', title: 'Send money', summary: '`MobileNumberInput` with the operator, the receiver\'s registered name, `AmountKeypad`, purpose and remark, then the `PinPad` and a receipt.' },
        { id: 'bills', title: 'Bills and top-up', summary: 'Electricity, water and internet: a biller form, the bill in a `BillSummary` (loading, error, nothing due), then pay; and mobile top-up by operator.' },
        { id: 'history', title: 'History', summary: 'Every payment with its status, search and filters; each opens in a sheet with its `PaymentTimeline` and receipt.' },
        { id: 'rewards', title: 'Rewards', summary: 'Cashback earned on bills, top-ups and QR payments, points with a tier meter, offers, and redeeming points into the balance.' },
      ],
      data:
        'A fixed history of wallet payments around the session date; merchant QR payloads built with `buildMerchantQr`; billers answer from a small simulated table. Pending payments settle on a timer after hydration. Nothing is fetched.',
    },
  },
  {
    slug: 'market-portal',
    title: 'Market portal',
    description:
      'A public NEPSE market portal built from Punji UI: indices, breadth, sector heatmap, a screener, a 10k-trade floorsheet, company pages, calendars and alerts.',
    lead: 'What a market data site shows, on one live simulated session: overview, screener, floorsheet, company pages, calendars and alerts.',
    group: 'apps',
    kind: 'app',
    summary:
      'The public side of the market: what a reader of a market data site sees before they trade. Ninety-six listed companies tick live; every trade is written to the floorsheet with its buying and selling broker, and each company\'s volume and turnover are those contracts summed, so the floorsheet, the overview, the screener and the company page agree to the paisa. Valuation ratios use the live price over trailing EPS and book value, the sector heatmap is sized by the same turnover, the calendars list the same book closures and AGMs the company pages show, and price alerts fire on the tick the price crosses.',
    use: [
      'Replace `site/src/apps/market-portal/market.ts` with your data feed: the screens read `LiveQuote` objects (bigint paisa, the `Quote` shape `StockTable` takes) and `FloorTrade` contracts.',
      'Feed fundamentals (EPS, book value, dividends) from published reports; `fundamentalsOf` recomputes P/E, P/B, yield and market cap from the live price.',
      'Keep watchlists and alerts on your server per reader and send the alert from there; the reducer only shows how they fire against the ticks.',
    ],
    avoid: [
      'Real prices, published financials and corporate announcements: everything here is generated. Verify against NEPSE, SEBON and company notices.',
      'Trading: the portal links to nothing that places orders. The trading terminal app shows that side.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `7` open the screens; `P` pauses and resumes the live prices. Plain keys never fire while you type in a field.',
      'The screener and floorsheet tables move between rows with the arrow keys; Enter on a column head sorts it and Shift+Enter adds it to the sort. Filter chips open their editor; Esc closes it and returns focus to the chip.',
      'Company search fields take the arrow keys and Enter; the watchlist moves a symbol up or down with its buttons.',
    ],
    accessibility: [
      'Each screen has its own `h2` and focus moves to it from the navigation. Alerts that fire, watchlist changes and the feed dropping are announced in a polite live region.',
      'Direction is never colour alone: arrows, signs and words, and breadth counts in text. The heatmap, charts and depth have their figures in tables.',
      'Scrolling tables and chip rows are focusable regions; live prices honour reduced motion and can be paused.',
    ],
    responsive: [
      'Wide screens: a navigation rail, index cards, the heatmap beside the movers and the company page in two columns.',
      'Phones (390 px first): a bottom tab bar, the indices as a scrolling strip, a square heatmap, and tables that scroll inside their own focusable region with the symbol pinned.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'Synthetic companies, prices, results and events. The session is 1 November 2026, opening at 11:00 and closing at 15:00; the page opens at 11:20 after twenty minutes of trading, and each tick is five simulated seconds.',
        'The floorsheet starts with about 13,000 contracts and grows while the market is open. Broker numbers are random.',
        'Dividends are shown on 100 shares with bonus shares at par; the company page\'s results are derived from the trailing EPS.',
      ],
    },
    related: ['market-indices', 'market-breadth', 'market-heatmap', 'market-movers', 'market-status', 'virtual-table', 'filter-chip', 'range-slider', 'list-filter', 'candlestick-chart', 'key-stats', 'dividend-history', 'corporate-action-timeline', 'depth-chart', 'order-book', 'issue-card', 'performance-chart', 'watchlist', 'company-search'],
    app: {
      screens: [
        { id: 'overview', title: 'Market overview', summary: 'NEPSE and sector indices with trend lines (`MarketIndices`), the market status, turnover, `MarketBreadth` with circuit hits, a sector `MarketHeatmap` sized by turnover, and gainers, losers and turnover leaders (`MarketMovers`).' },
        { id: 'screener', title: 'Screener', summary: 'Every listed company in a `VirtualFinancialTable` with the symbol pinned, multi-sort, preset screens, sector and range filters (`FilterChip`, `RangeSlider`, `ListFilter`), column choice and `TableExport`.' },
        { id: 'floorsheet', title: 'Floorsheet', summary: 'Today\'s 13,000+ contracts, live, with buyer and seller broker filters, totals of what is shown and CSV export.' },
        { id: 'company', title: 'Company page', summary: 'Candles with volume, `KeyStats`, `FinancialSummary` and quarterly results, `DividendHistory`, `CorporateActionTimeline`, depth and the order book, and sector peers.' },
        { id: 'calendars', title: 'Calendars', summary: 'IPO, FPO, rights and fund issues (`IssueList`), and upcoming or recent book closures and AGMs for every company.' },
        { id: 'compare', title: 'Compare', summary: 'Up to five companies against the NEPSE index in a `PerformanceChart`, with the period\'s returns ranked.' },
        { id: 'watchlist', title: 'Watchlist', summary: 'A reorderable `Watchlist` at live prices and price alerts that fire once when the price crosses.' },
      ],
      data:
        'A seeded generator (`site/src/apps/market-portal/market.ts`) adds 80 companies to the shared sim\'s 16 scrips with fundamentals, a year of daily candles, dividends and corporate events, and writes every trade to the floorsheet. The same seed gives the same market on the server and in the browser, so the page prerenders the 11:20 state and the clock starts after hydration. Nothing is fetched.',
    },
  },
  {
    slug: 'invest-insure',
    title: 'Invest and insure',
    description:
      'A mutual fund and insurance app built from Punji UI: fund explorer with riskometers, SIP planner and orders, portfolio XIRR, policies, claims and tax saving.',
    lead: 'Funds, SIPs and insurance of the Groww, Kuvera and PolicyBazaar class, with every rupee and unit exact.',
    group: 'apps',
    kind: 'app',
    summary:
      'An investor\'s app for mutual funds and insurance, phone first. Explore eight funds by category with a riskometer, 1, 3 and 5-year returns, the expense ratio and the NAV history; plan a SIP with a step-up and a goal and see the exact projection against a lump sum; order it, follow the order to an allotment of units at NAV, and see the units, value and XIRR in the portfolio. On the insurance side: policy cards with premiums and due reminders, a term-cover gap from income and loans, claim filing with documents and a status timeline, and nominees whose shares must total 100%. The tax view adds up what reduces taxable income (retirement fund SIPs and CIT, life and health premiums) against example caps. One reducer holds the folio and the policies, so an allotment moves the portfolio, the savings in the cover gap and the retirement contribution in the tax view together.',
    use: [
      'Replace `data.ts` with your fund house\'s or aggregator\'s feed: the screens read NAVs as decimal strings and amounts as bigint paisa, the shape `allotUnits` and `unitsValue` take.',
      'Send `order` to your order API (ConnectIPS or a bank mandate for the debit) and map its statuses to the order timeline; allot with the NAV the registrar applied, not the latest one.',
      'Feed policies, premiums and claim statuses from the insurer\'s API; keep `termCoverNeeded` for the gap and `taxableIncome` with the caps for the year you show.',
    ],
    avoid: [
      'Authentication, KYC, the bank mandate and the registrar: orders here settle on a timer.',
      'Advice: projections are illustrations at a return you choose, the cover gap is a starting point and the tax caps are examples, not current law.',
    ],
    api: [],
    examples: [],
    keyboard: [
      '`1` to `5` open the screens. Plain keys never fire while you type in a field.',
      'Funds are buttons (Enter opens one; "All funds" returns focus to it); categories are toggle chips; period, view and calendar switches are segmented controls that move with the arrow keys.',
      'Order, claim and nominee forms are ordinary forms: Tab, Space and Enter; each step moves focus to its heading. Wide tables scroll in focusable regions with the arrow keys.',
    ],
    accessibility: [
      'Each screen has its own `h2` and focus moves to it from the navigation. Orders, allotments, premiums, claims and nominee changes are announced in a polite live region.',
      'Risk is printed in words beside the riskometer ("Moderately high, 4 of 6"); returns and gains carry a sign, never colour alone; the NAV chart has a data table.',
      'Statuses (order steps, claim steps, policy status, SIP paused) are words with icons.',
    ],
    responsive: [
      'Designed at 390 px: fund cards in one column, stacked forms and a bottom tab bar. Wider screens get a navigation rail, fund cards in a grid and the projection beside the plan.',
      'Tables become labelled rows on phones; the SIP calendar scrolls inside a focusable region.',
    ],
    notes: {
      title: 'Limits',
      points: [
        'Every fund house, insurer, fund and person is invented. NAVs are a seeded weekly series to 1 November 2026 (15 Kartik 2083); orders allot at that NAV.',
        'Projections compound the expected return monthly with each instalment at the start of the month; the balance is carried exactly and each figure is rounded once (half-even). XIRR is solved by bisection on bigint fixed-point to 0.01% here (8 places in the package).',
        'Tax caps and slabs are examples in the shape of FY 2081/82 (retirement 5 lakh or a third of income, life premium Rs 40,000, health premium Rs 20,000). "Fail the next request" makes orders, premiums and claims fail so the error states can be seen.',
      ],
    },
    related: ['risk-meter', 'invest-helpers', 'insurance-premium-card', 'performance-chart', 'payment-timeline', 'document-upload', 'income-tax-calculator', 'tax-helpers', 'currency-input', 'meter-range', 'financial-summary'],
    app: {
      screens: [
        { id: 'funds', title: 'Mutual funds', summary: 'Eight funds with a `RiskMeter`, 1, 3 and 5-year returns, the expense ratio and NAV; filter by category and sort. A fund opens with its NAV history (`PerformanceChart`), returns against its category, facts and your holding.' },
        { id: 'sip', title: 'SIP planner', summary: 'Monthly amount, years, return, step-up and a goal; the exact projection (`projectSip`) against a lump sum (`projectLumpSum`), the SIP needed for the goal (`sipForGoal`), a SIP calendar in BS or AD, then review, order and allotment at NAV (`allotUnits`).' },
        { id: 'portfolio', title: 'Portfolio', summary: 'Current value, invested, gain and XIRR (`xirr`) in total and per fund, allocation by category, SIPs you can pause, orders in progress and every allotment.' },
        { id: 'insurance', title: 'Insurance', summary: '`InsurancePremiumCard` for each policy with pay and premium reminders, the cover gap (`termCoverNeeded`), claims with `DocumentUpload` and a `PaymentTimeline`, and nominees.' },
        { id: 'tax', title: 'Tax saving', summary: 'Retirement fund SIPs and CIT, life and health premiums against example caps (`taxableIncome`), the tax by band (`IncomeTaxBreakdown`), the tax saved and the room left this year.' },
      ],
      data:
        'Eight synthetic funds with five years of seeded weekly NAVs (`site/src/apps/invest-insure/data.ts`), three SIPs and a lump sum paid since 2023 and allotted at those NAVs, three policies, a settled claim and nominees. Orders and claims move on a timer after hydration. Nothing is fetched.',
    },
  },
];
