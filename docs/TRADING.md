# Trading components

The pieces of a broker terminal (NEPSE TMS and similar): the cost of an order, the order ticket, the person's order
and trade books, and the banner for a halt. Market data components (quotes, depth, circuit limits) are in
[MARKET.md](MARKET.md). All money is bigint minor units (paisa); every rate is a decimal fraction string; nothing passes
through a float.

| Subpath | Exports |
| --- | --- |
| `@punji/ui/nepse-fees` | `estimateNepseTrade`, `brokerCommission`, `sebonFee`, `capitalGainsTaxRate`, `commissionSlabFor`, `nepseFeeSchedule` |
| `@punji/ui/order-ticket` | `OrderTicket`, `snapToTick`, `isOnTick`, `validateOrder` |
| `@punji/ui/order-list` | `OrderList`, `TradeList`, `isOrderLive`, `orderStatusTone` |
| `@punji/ui/trading-halt` | `TradingHaltBanner`, `circuitBreakerStage`, `nepseCircuitTiers` |

CSS: `@punji/ui/css/order-ticket.css`, `order-list.css`, `trading-halt.css` (all in `styles.css`).

## NEPSE fees (`@punji/ui/nepse-fees`)

Pure: no React, no browser globals; it imports only `calculations/rounding.ts` (checked by `check-boundaries`).

```ts
import { estimateNepseTrade, nepseFeeSchedule } from '@punji/ui/nepse-fees';

const buy = estimateNepseTrade({ side: 'buy', quantity: 100n, price: 51_230n });
// amount 5,123,000 · commission 16,906 (0.33%) · SEBON 768 · DP 0 · total 5,140,674 paisa

const sell = estimateNepseTrade({ side: 'sell', quantity: 100n, price: 60_000n, costBasis: buy.total, holdingDays: 100 });
// fees 23,200 · capital gain 836,126 · CGT 7.5% = 62,709 · receivable 5,914,091 paisa
```

A `NepseFeeSchedule` holds every figure the regulator can change:

| Field | Meaning |
| --- | --- |
| `commission.slabs` | Ascending `{ upTo, rate }` bands; `upTo` is inclusive minor units, the last band `null` |
| `commission.minimum` | Smallest commission (Rs 10 = `1_000n`) |
| `commission.method` | `'whole'` (NEPSE: the band's rate applies to the whole amount) or `'marginal'` (per band, like tax slabs) |
| `sebonRate` | SEBON fee fraction (`'0.00015'`) |
| `dpCharge`, `dpChargeOn` | CDSC DP charge per scrip per day and which side pays it (`'sell'`, `'both'`, `'none'`) |
| `capitalGains` | Individual short and long term rates, institution rate, `longTermAfterDays` (365: more than 365 days is long term) |
| `rounding` | `RoundingMode` for every fraction of a paisa, applied once per fee |

`nepseFeeSchedule` is an example from the rates published in 2024 (0.36% up to Rs 50,000, 0.33% to Rs 5 lakh, 0.31% to
Rs 20 lakh, 0.27% to Rs 1 crore, 0.24% above, minimum Rs 10; SEBON 0.015%; DP Rs 25 on a sell; CGT 7.5% / 5% for
individuals, 10% for institutions). It is not an authority: verify against current SEBON and CDSC notices and pass your
own schedule (`{ ...nepseFeeSchedule, commission: { ...nepseFeeSchedule.commission, slabs } }`).

Rules: capital gains tax needs a `costBasis` (WACC × quantity, fees included) and a `holdingDays` (or
`investor: 'institution'`); a loss owes nothing; loss set-off across trades is the caller's. `dpScrips: 0` skips the DP
charge for a second order in a scrip already charged that day. `perUnit` is the total divided by quantity with the
schedule's rounding (the effective cost or proceeds per share).

## OrderTicket

A `<form>` with Buy/Sell (`SegmentedControl`), quantity and price (`NumberField` spin buttons stepping by `lotSize` and
`tickSize`), quick fills for the lower limit, LTP and upper limit, an exact estimate, and a submit button that names the
order ("Buy 100 NABIL").

- Limits: `lowerLimit` and `upperLimit` (published, preferred) or `previousClose` + `bandRate` through `circuitLimits`.
- Leaving the price field moves an off-tick price to the nearest tick, stepping back inside the band if needed, and
  announces it in a polite status ("Moved to the nearest tick: 512.30").
- Submit runs `validateOrder` and focuses the first problem. With `confirm` (default true) an `InlineConfirm`
  (`role="alertdialog"`, "Buy 100 NABIL at 512.30?", total in the body) takes focus; Esc goes back.
- `onSubmit({ symbol, side, quantity, price, estimate })`. The ticket keeps no order state; `busy` shows a request in
  flight; `disabledReason` disables submit and shows why (market closed, halted).
- Sell: `costPerUnit` (WACC) and `holdingDays` add capital gains tax to the estimate.
- `money: nepalMoneyConfig({ digits: 'deva' })` shows every figure in Devanagari. The fields accept Devanagari digits.
- `labels` translates every word, including each issue message.

`validateOrder(draft, rules)` returns issues in field order: `quantity-missing`, `quantity-min`, `quantity-max`,
`quantity-lot`, then `price-missing`, `price-above-upper`, `price-below-lower`, `price-tick`. `snapToTick(price, tick,
mode)` uses a `RoundingMode` (`'half-up'` nearest, `'floor'` down, `'ceil'` up).

## OrderList and TradeList

`OrderList` is the person's order book (not market depth, which is `OrderBook`): symbol with a Buy/Sell pill, time,
filled share ("60 of 100" plus a decorative meter), limit and average price, a status pill in words, and Modify and
Cancel for live orders (`pending`, `open`, `partially-filled`). Cancel asks first, in place. Each button's accessible
name carries the order ("Cancel NABIL buy 100 at 512.30"). A status change between renders is announced in a polite
live region ("NABIL buy 100: Filled"). `pendingIds` marks orders with a request in flight.

`TradeList` is the trade book: each fill with its exact amount (quantity × price) and an optional counterparty broker;
the totals row keeps bought and sold apart. Both are `DataTable`s with captions and stack on phones.

## TradingHaltBanner

`kind`: `circuit-breaker` (with `changePercent` it states the move and, from `circuitBreakerStage`, the pause),
`halt`, or `resumed`. Halts are `role="alert"`; resumed is `role="status"`. An icon and words carry the state.
`resumesAt` is text you format (AD or BS). `nepseCircuitTiers` is an example (±4% pauses 15 minutes, ±5% 40 minutes,
±6% closes the day); verify it against the current NEPSE bylaws, which also exempt late-session triggers.

## Decisions

- Fees are a separate pure module so a server, a calculator page and the ticket compute the same paisa.
- Every regulatory figure is data in one schedule object, never a constant inside a function.
- The ticket never sends anything and never trusts itself: the exchange and broker validate again.
- The order list asks (`onCancel`, `onModify`) and never mutates, like `Watchlist`.
- Not built yet: positions/P&L beyond `HoldingsTable`, a floorsheet (waiting on a virtualised table), a broker picker.
