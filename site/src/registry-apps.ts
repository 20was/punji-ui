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
];
