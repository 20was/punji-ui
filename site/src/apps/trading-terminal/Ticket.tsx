import { MoneyDisplay } from '@punji/ui/money-display';
import { OrderTicket } from '@punji/ui/order-ticket';
import { Select } from '@punji/ui/select';
import { LOT, SCRIPS, TICK, timeAt } from '../shared/sim.ts';
import { heldQuantity, npr, quoteOf, useTerminal } from './store.ts';

const SYMBOL_OPTIONS = SCRIPS.map((s) => ({ value: s.symbol, label: `${s.symbol} · ${s.name}` }));

/**
 * The order ticket for the selected scrip, wired to the account: live LTP and band, the holding's average cost on a
 * sell (so the estimate includes capital gains tax), the buying power, and a disabled reason while trading is halted.
 * It starts over when the scrip or the requested side changes (`key`).
 */
export function Ticket({ pickSymbol = false }: { pickSymbol?: boolean }) {
  const { state, derived, dispatch } = useTerminal();
  const quote = quoteOf(derived, state.symbol)!;
  const holding = derived.summary.holdings.find((h) => h.symbol === state.symbol);
  const held = heldQuantity(state.ledger, state.symbol);
  const halt = state.market.halt;
  const disabledReason =
    halt?.kind === 'circuit-breaker' ? `Trading is halted by the index circuit breaker until ${timeAt(halt.untilTick)}.` : state.feedDown ? 'The price feed is down. Orders resume when prices do.' : undefined;
  return (
    <div className="tt-ticket">
      {pickSymbol && (
        <Select
          label="Scrip"
          labelPlacement="above"
          value={state.symbol}
          onChange={(symbol) => dispatch({ type: 'select', symbol })}
          options={SYMBOL_OPTIONS}
          block
          testId="tt-ticket-symbol"
        />
      )}
      <OrderTicket
        key={`${state.symbol}-${state.ticket.nonce}`}
        symbol={state.symbol}
        defaultSide={state.ticket.side}
        defaultPrice={state.ticket.price ?? quote.ltp}
        defaultQuantity={state.ticket.quantity ?? LOT}
        ltp={quote.ltp}
        lowerLimit={quote.lowerLimit}
        upperLimit={quote.upperLimit}
        tickSize={TICK}
        lotSize={LOT}
        costPerUnit={holding?.averageCost ?? undefined}
        holdingDays={state.ledger.some((t) => t.symbol === state.symbol && t.tick < 0) ? 400 : 0}
        money={npr}
        disabledReason={disabledReason}
        onSubmit={(order) => dispatch({ type: 'place', order })}
        headingLevel={3}
        testId="tt-ticket"
      />
      <dl className="tt-facts is-ticket">
        <div>
          <dt>Buying power</dt>
          <dd>
            <MoneyDisplay value={derived.available} preset={npr} />
          </dd>
        </div>
        <div>
          <dt>Held</dt>
          <dd>
            {held.toLocaleString('en-IN')} {state.symbol}
          </dd>
        </div>
      </dl>
    </div>
  );
}
