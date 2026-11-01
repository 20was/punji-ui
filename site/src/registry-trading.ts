// Pages for the trading pieces: NEPSE fee utilities, OrderTicket, OrderList/TradeList and TradingHaltBanner. Kept apart
// from registry.ts so they merge cleanly with pages added in parallel. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const TRADING_PAGES: readonly PageDef[] = [
  {
    slug: 'nepse-fees',
    title: 'NEPSE fees',
    description: 'Exact NEPSE trade costs in paisa: broker commission bands, SEBON fee, DP charge and capital gains tax by holding period, all configurable.',
    lead: 'Every cost of a NEPSE order, exact to the paisa, from a fee schedule you can replace when SEBON changes it.',
    group: 'stock-market',
    kind: 'utility',
    summary:
      'Pure TypeScript for the cost of a NEPSE trade: no React, no browser, no dependency. Amounts are bigint paisa and every rate is a decimal string, so nothing is a float. `estimateNepseTrade` returns the amount, broker commission, SEBON fee, DP charge, capital gains tax on a sell, the total payable or receivable, and the effective price per unit. Every figure comes from a `NepseFeeSchedule`; `nepseFeeSchedule` is a dated example to verify, not an authority.',
    use: [
      'The estimate under an order ticket, a "what will I receive" calculator, a contract-note check.',
      'Pass your own schedule when SEBON revises the bands: `{ ...nepseFeeSchedule, commission: { ...nepseFeeSchedule.commission, slabs } }`.',
      'Capital gains tax: pass `costBasis` (WACC × quantity, fees included) and `holdingDays`; institutions use `investor: \'institution\'`.',
    ],
    avoid: [
      'Treating the estimate as the contract note. The broker\'s note is final; show the estimate as an estimate.',
      'Floats anywhere: convert typed text with `parseMinorUnits`, never `Number`.',
      'Hard-coding today\'s rates in your app: keep one schedule object, dated, and replace it.',
    ],
    api: [...ui('nepse-fees', 'estimateNepseTrade', 'brokerCommission', 'sebonFee', 'capitalGainsTaxRate', 'commissionSlabFor', 'nepseFeeSchedule', 'NepseFeeSchedule', 'NepseTradeEstimate')],
    examples: [
      { id: 'estimate', title: 'Buy and sell', note: 'The same 100 NABIL bought at 512.30 and sold at 600.00 after 100 days: every line is exact paisa.' },
      { id: 'bands', title: 'Commission bands', note: 'The band sets one rate for the whole amount, so Rs 50,000.01 pays less than Rs 50,000. A marginal schedule is one setting away.' },
    ],
    keyboard: ['Not interactive.'],
    accessibility: ['Not applicable: pure functions. Display the results with `MoneyDisplay` so amounts are spoken with their currency.'],
    responsive: ['Not applicable: pure functions.'],
    notes: {
      title: 'Limits',
      points: [
        '`nepseFeeSchedule` holds the rates published in 2024 (commission bands 0.36% to 0.24%, minimum Rs 10, SEBON 0.015%, DP Rs 25 on a sell, CGT 7.5% / 5% for individuals and 10% for institutions). Verify against current SEBON and CDSC notices.',
        'The DP charge is per scrip per day. Pass `dpScrips: 0` for a second order in a scrip already charged today.',
        'Capital gains tax is computed only with a cost basis and a holding period (or an institution). Losses owe nothing here; loss set-off across trades is your rule.',
        'Rounding is the schedule\'s `rounding` (default half-up to the paisa), applied once per fee.',
      ],
    },
    related: ['order-ticket', 'financial-calculations', 'percentage-input'],
  },
  {
    slug: 'order-ticket',
    title: 'OrderTicket',
    description: 'A buy or sell ticket for NEPSE: lot and tick steps, tick snapping, a circuit band check and an exact fee estimate before a confirm step.',
    lead: 'Place a buy or sell with the price on the tick, inside the circuit band, and every rupee of cost shown before you confirm.',
    group: 'stock-market',
    kind: 'component',
    summary:
      'The order form of a trading terminal. Buy and Sell are a toggle; quantity steps in lots and price steps in ticks (arrow keys or the buttons). Leaving the price field moves it to the nearest tick, inside the band, and says so. The circuit band comes from the published limits or from the previous close and a band rate (`circuitLimits`), with one-tap fills for the lower limit, the LTP and the upper limit. The estimate is exact paisa from `estimateNepseTrade`. Submit checks everything, focuses the first problem, and asks to confirm with the total before `onSubmit` hands you the order.',
    use: [
      'The order panel beside a quote or a market depth view.',
      '`disabledReason` while the market is closed or halted, so the ticket explains instead of failing.',
      'For a sell, `costPerUnit` (WACC) and `holdingDays` add capital gains tax to the estimate.',
    ],
    avoid: [
      'Treating the checks as the exchange\'s. They catch mistakes on screen; your broker\'s system is the authority.',
      'Turning off the confirm step for real-money orders without another review step.',
      'Computing limits yourself when the exchange publishes them: pass `lowerLimit` and `upperLimit`.',
    ],
    api: [...ui('order-ticket', 'OrderTicket', 'OrderTicketOrder', 'snapToTick', 'isOnTick', 'validateOrder')],
    examples: [
      { id: 'buy', title: 'Buy', note: 'Lots of 10, tick 0.10, band from the previous close. Type 512.34 and leave the field: it moves to 512.30.' },
      { id: 'sell', title: 'Sell with tax', note: 'Published limits, WACC and a 100-day holding: the estimate adds the DP charge and 7.5% capital gains tax.' },
      { id: 'halted', title: 'Halted, in Devanagari', note: 'A halt reason disables the ticket; nepalMoneyConfig({ digits: \'deva\' }) shows the figures in Devanagari.' },
    ],
    keyboard: [
      'Tab moves through side, quantity, price, the quick fills and submit. Arrow keys move between Buy and Sell.',
      'In quantity and price, ArrowUp and ArrowDown step one lot or tick; Shift or PageUp/PageDown step ten; Home and End go to the band.',
      'Enter submits. In the confirm step, the confirm button has focus and Esc goes back to the ticket.',
    ],
    accessibility: [
      'A `<form>` named by its heading ("Buy NABIL"); Buy and Sell are pressed-state buttons in a named group.',
      'Errors use `aria-invalid` and `role="alert"` and the first problem gets focus on submit. Tick snapping is announced in a polite status.',
      'The confirm is an `alertdialog` whose name repeats the order ("Buy 100 NABIL at 512.30?") and whose body states the total.',
      'Side is never colour alone: the heading and the button say Buy or Sell.',
    ],
    responsive: ['Fills its container. Quantity and price sit side by side from about 340px and stack below; touch screens get 44px targets.'],
    notes: {
      title: 'Limits',
      points: [
        'The ticket places nothing and keeps no order state: `onSubmit` receives `{ symbol, side, quantity, price, estimate }`, and `busy` shows your request in flight.',
        'Derived limits round toward the close, not to the tick; quick fills step inside the band to the nearest tick.',
        'Only limit orders: market orders and order validity (day, IOC) belong to your broker integration.',
      ],
    },
    related: ['nepse-fees', 'price-limit', 'order-book', 'order-list', 'trading-halt'],
  },
  {
    slug: 'order-list',
    title: 'OrderList and TradeList',
    navTitle: 'OrderList',
    description: "A trader's order book and trade book: status in words, filled share, Modify and Cancel with a confirm, and announced status changes.",
    lead: 'Today\'s orders with their status in words and safe Modify and Cancel, plus the fills they produced.',
    group: 'stock-market',
    kind: 'component',
    summary:
      'OrderList is the person\'s own order book (not market depth): symbol and side, time, filled share ("60 of 100" with a small meter), limit and average price, a status pill in words, and Modify and Cancel for live orders. Cancel asks first, in place. A change of status between renders is announced politely ("NABIL buy 100: Filled"). TradeList is the trade book: each fill with its exact amount, and a totals row with bought and sold apart. Both are `DataTable`s and stack on phones.',
    use: ['The orders and trades tabs of a terminal.', '`pendingIds` while a cancel or modify request is in flight.'],
    avoid: ['Market depth: use `OrderBook`.', 'Changing orders inside the list: `onCancel` and `onModify` only ask.'],
    api: [...ui('order-list', 'OrderList', 'TradeList', 'TradingOrder', 'TradeFill', 'isOrderLive', 'orderStatusTone')],
    examples: [
      { id: 'orders', title: 'Order book', note: 'Cancel asks first; the demo fills the open NTC order two seconds after you press the button so you can hear the announcement.' },
      { id: 'trades', title: 'Trade book', note: 'Fills with exact amounts and a counterparty broker; the totals keep buys and sells apart.' },
    ],
    keyboard: ['Tab reaches each row\'s Modify and Cancel. In the cancel confirm, the confirm button has focus and Esc keeps the order.'],
    accessibility: [
      'Native table semantics with a caption; the symbol cell is the row header.',
      'Each button\'s name carries the order ("Cancel NABIL buy 100 at 512.30"), so a list of Cancel buttons is not ambiguous.',
      'Status is a word in a pill, never colour alone; status changes are announced in a polite live region.',
    ],
    responsive: ['Under 640px each order becomes a block; the time column folds away under 760px.'],
    related: ['order-ticket', 'order-book', 'status-pill', 'data-table'],
  },
  {
    slug: 'trading-halt',
    title: 'TradingHaltBanner',
    description: 'A banner for an index circuit breaker, an exchange halt or resumed trading, announced at once, with the move and the resume time in words.',
    lead: 'Tell traders at once that trading stopped, why, and when it resumes, then politely that it has.',
    group: 'stock-market',
    kind: 'component',
    summary:
      'The line across a terminal when trading stops. `circuit-breaker` names the index move and the pause from `circuitBreakerStage` (NEPSE example tiers: ±4% pauses 15 minutes, ±5% 40 minutes, ±6% closes the day); `halt` is an exchange halt; `resumed` is the all-clear. A halt is `role="alert"` so it is heard at once; resumed is a polite status. An icon and words carry the state, never colour alone.',
    use: ['At the top of a terminal or above an order ticket, with the ticket\'s `disabledReason` set while halted.', '`resumesAt` from the exchange notice when it gives a time.'],
    avoid: ['A banner for a single scrip at its circuit: use `PriceLimitIndicator`.', 'Re-rendering a halt banner on every tick: an alert is announced each time it mounts.'],
    api: [...ui('trading-halt', 'TradingHaltBanner', 'circuitBreakerStage', 'nepseCircuitTiers', 'CircuitTier')],
    examples: [
      { id: 'states', title: 'States', note: 'A 4% fall, a 6% rise that closes the day, an exchange halt with a notice and resumed trading.' },
    ],
    keyboard: ['The dismiss button, when shown, is a normal button.'],
    accessibility: ['`role="alert"` for a halt or breaker, `role="status"` for resumed.', 'A warning, error or success icon plus a title in words.'],
    responsive: ['Full width; the text wraps and the actions stay at the end.'],
    notes: {
      title: 'Limits',
      points: ['`nepseCircuitTiers` is an example. Verify it against the current NEPSE bylaws, which also exempt triggers late in the session.', 'Times are text you format (AD or BS); the banner keeps no clock.'],
    },
    related: ['market-status', 'order-ticket', 'price-limit'],
  },
];
