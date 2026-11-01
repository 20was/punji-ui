// Apps: complete, interactive dashboards at /apps/<slug>/, built only from @punji/ui exports on a simulated market.
// Each app is site/src/apps/<slug>/App.tsx (default export); the page frame (bar, About) comes from AppView.tsx.
// Kept apart from registry.ts so it merges cleanly. Pure data (no JSX). See site/README.md, "Add an app".
import type { PageDef } from './registry.ts';

export const APP_PAGES: readonly PageDef[] = [
  {
    slug: 'trading-terminal',
    title: 'Trading terminal: live NEPSE order entry demo',
    navTitle: 'Trading terminal',
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
    title: 'Wealth dashboard: portfolio and IPO centre demo',
    navTitle: 'Wealth dashboard',
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
];
