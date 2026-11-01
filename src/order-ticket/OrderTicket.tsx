'use client';

/**
 * OrderTicket: the buy or sell form of a trading terminal. Quantity steps in lots, the price steps in ticks and
 * snaps onto the tick grid when the field is left, the day's circuit band is checked (published limits, or a band
 * from the previous close through `circuitLimits`), and an exact estimate shows the commission, SEBON fee, DP
 * charge and, on a sell with a cost basis, capital gains tax. Money is bigint minor units throughout. The ticket
 * places nothing: `onSubmit` hands you a checked order, after an optional confirm step.
 */
import { useId, useRef, useState, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { parseRate } from '../calculations/rounding.ts';
import { SegmentedControl } from '../controls/Controls.tsx';
import { NumberField } from '../fields/Fields.tsx';
import { InlineConfirm } from '../inline-confirm/InlineConfirm.tsx';
import { getMoneyFormatter, nepalMoneyConfig, type MoneyFormatConfig } from '../money/money.ts';
import { parseLocalizedDecimal } from '../nepal/decimal.ts';
import { minorUnitsToDecimal, parseMinorUnits } from '../nepal/money.ts';
import { estimateNepseTrade, nepseFeeSchedule, type InvestorType, type NepseFeeSchedule, type NepseTradeEstimate } from '../nepse-fees/fees.ts';
import { circuitLimits } from '../price-limit/limits.ts';
import { Note } from '../states/States.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { isOnTick, snapToTick, validateOrder, type OrderIssue } from './ticket.ts';

export { isOnTick, snapToTick, validateOrder } from './ticket.ts';
export type { OrderDraft, OrderIssue, OrderRules } from './ticket.ts';

export type OrderSide = 'buy' | 'sell';

/** What `onSubmit` receives: a checked order and the estimate the person saw. */
export interface OrderTicketOrder {
  /** The scrip. */
  symbol: string;
  /** Buy or sell. */
  side: OrderSide;
  /** Units, a multiple of the lot size. */
  quantity: bigint;
  /** Minor units per unit, on the tick grid and inside the band. */
  price: bigint;
  /** The fee estimate shown when the order was confirmed. */
  estimate: NepseTradeEstimate;
}

/** Figures passed to the issue messages, already formatted. */
export interface OrderIssueContext { lot: string; min: string; max: string; tick: string; lower: string; upper: string }

export interface OrderTicketLabels {
  /** The ticket's heading ("Buy NABIL"). */
  title: (side: OrderSide, symbol: string) => string;
  side: string; buy: string; sell: string; quantity: string; price: string;
  ltp: string; lower: string; upper: string;
  /** The quantity hint ("Lots of 10"). */
  lotHint: (lot: string) => string;
  /** The price hint ("Band 457.20 to 563.50 · tick 0.10"); `band` is null when no limits are known. */
  priceHint: (band: { lower: string; upper: string } | null, tick: string) => string;
  /** Shown and announced after the price was moved onto the tick grid. */
  snapped: (price: string) => string;
  estimate: string; amount: string; commission: string; sebon: string; dp: string; cgt: string;
  totalBuy: string; totalSell: string;
  /** A line under the estimate. */
  estimateNote: string;
  submit: (side: OrderSide, quantity: string, symbol: string) => string;
  confirmTitle: (side: OrderSide, quantity: string, symbol: string, price: string) => string;
  confirmBody: (side: OrderSide, total: string) => string;
  confirm: (side: OrderSide) => string;
  back: string;
  issues: Record<OrderIssue, (context: OrderIssueContext) => string>;
}

const sideWord = (side: OrderSide) => (side === 'buy' ? 'Buy' : 'Sell');
const EN: OrderTicketLabels = {
  title: (side, symbol) => `${sideWord(side)} ${symbol}`,
  side: 'Side', buy: 'Buy', sell: 'Sell', quantity: 'Quantity', price: 'Limit price',
  ltp: 'LTP', lower: 'Lower', upper: 'Upper',
  lotHint: (lot) => (lot === '1' ? 'Whole units' : `Lots of ${lot}`),
  priceHint: (band, tick) => (band ? `Band ${band.lower} to ${band.upper} · tick ${tick}` : `Tick ${tick}`),
  snapped: (price) => `Moved to the nearest tick: ${price}`,
  estimate: 'Estimate', amount: 'Amount', commission: 'Broker commission', sebon: 'SEBON fee', dp: 'DP charge', cgt: 'Capital gains tax',
  totalBuy: 'Total payable', totalSell: 'Total receivable',
  estimateNote: 'An estimate from the fee schedule in use. Your broker’s contract note is final.',
  submit: (side, quantity, symbol) => `${sideWord(side)} ${quantity} ${symbol}`,
  confirmTitle: (side, quantity, symbol, price) => `${sideWord(side)} ${quantity} ${symbol} at ${price}?`,
  confirmBody: (side, total) => `${side === 'buy' ? 'Total payable' : 'Total receivable'} ${total}.`,
  confirm: (side) => `Place ${side} order`,
  back: 'Edit order',
  issues: {
    'quantity-missing': () => 'Enter a quantity.',
    'quantity-lot': ({ lot }) => `Enter a multiple of ${lot}.`,
    'quantity-min': ({ min }) => `The smallest order is ${min}.`,
    'quantity-max': ({ max }) => `The largest order is ${max}.`,
    'price-missing': () => 'Enter a price.',
    'price-tick': ({ tick }) => `Use a multiple of ${tick}.`,
    'price-above-upper': ({ upper }) => `Above the upper circuit of ${upper}.`,
    'price-below-lower': ({ lower }) => `Below the lower circuit of ${lower}.`,
  },
};

export interface OrderTicketProps {
  /** The scrip ("NABIL"). */
  symbol: string;
  /** Controlled side. Omit to let the ticket hold it (`defaultSide`). */
  side?: OrderSide;
  /** The starting side when uncontrolled. Default 'buy'. */
  defaultSide?: OrderSide;
  /** Called when the person picks a side. */
  onSideChange?: (side: OrderSide) => void;
  /** The starting quantity. */
  defaultQuantity?: bigint;
  /** The starting price in minor units (often the LTP). */
  defaultPrice?: bigint;
  /** Last traded price in minor units: a quick-fill button. */
  ltp?: bigint | null;
  /** The exchange's published lower circuit limit in minor units. Used with `upperLimit`. */
  lowerLimit?: bigint | null;
  /** The exchange's published upper circuit limit in minor units. */
  upperLimit?: bigint | null;
  /** With `bandRate`, derives the limits when none are published. */
  previousClose?: bigint | null;
  /** Decimal fraction string for the band around the previous close ('0.10' is ±10%). */
  bandRate?: string;
  /** Price step in minor units. Default 10n (Rs 0.10, NEPSE). */
  tickSize?: bigint;
  /** Quantity step. Default 1n. NEPSE's regular market trades in lots of 10. */
  lotSize?: bigint;
  /** Smallest quantity. Default the lot size. */
  minQuantity?: bigint;
  /** Largest quantity, when your broker caps it. */
  maxQuantity?: bigint;
  /** The fee schedule for the estimate. Default `nepseFeeSchedule` (an example: verify it). */
  feeSchedule?: NepseFeeSchedule;
  /** Sell only: what each unit cost, fees included (WACC), in minor units. With `holdingDays` it adds capital gains tax to the estimate. */
  costPerUnit?: bigint;
  /** Sell only: days held, for the tax rate. */
  holdingDays?: number;
  /** Default 'individual'. */
  investor?: InvestorType;
  /** Currency and locale of the figures. Default `nepalMoneyConfig()`; pass `nepalMoneyConfig({ digits: 'deva' })` for Devanagari digits. */
  money?: MoneyFormatConfig;
  /** Ask for a confirm step before `onSubmit`. Default true. */
  confirm?: boolean;
  /** Called with a checked order. */
  onSubmit: (order: OrderTicketOrder) => void;
  /** The order is being sent: the button shows a spinner and cannot be pressed twice. */
  busy?: boolean;
  /** Why orders cannot be placed now ("The market is halted"). Disables the submit button and shows the reason. */
  disabledReason?: ReactNode;
  /** Words in the reader's language. Partial overrides of the English defaults. */
  labels?: Partial<Omit<OrderTicketLabels, 'issues'>> & { issues?: Partial<OrderTicketLabels['issues']> };
  /** The heading level of the ticket's title, to fit the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Prefix for data-testid on the parts (`${testId}-quantity`, `-price`, `-submit`). */
  testId?: string;
  /** Layout only. */
  className?: string;
}

function percentOf(rate: string): string {
  const { numerator, denominator } = parseRate(rate);
  const places = denominator.toString().length - 1;
  const text = minorUnitsToDecimal(numerator * 100n, places);
  return places ? text.replace(/\.?0+$/, '') : text;
}

export function OrderTicket({
  symbol, side: sideProp, defaultSide = 'buy', onSideChange, defaultQuantity, defaultPrice, ltp, lowerLimit, upperLimit, previousClose, bandRate,
  tickSize = 10n, lotSize = 1n, minQuantity, maxQuantity, feeSchedule = nepseFeeSchedule, costPerUnit, holdingDays, investor,
  money, confirm = true, onSubmit, busy, disabledReason, labels, headingLevel = 3, testId, className,
}: OrderTicketProps) {
  const words: OrderTicketLabels = { ...EN, ...labels, issues: { ...EN.issues, ...labels?.issues } };
  const config = money ?? nepalMoneyConfig();
  const amounts = getMoneyFormatter(config);
  const prices = getMoneyFormatter({ ...config, display: 'none' });
  const scale = prices.exponent;
  const digits = config.numberingSystem === 'deva' ? (text: string) => text.replace(/\d/g, (d) => '०१२३४५६७८९'[Number(d)]!) : (text: string) => text;
  const count = (value: bigint) => digits(value.toString());

  const [side, setSide] = useControllableState<OrderSide>({ value: sideProp, defaultValue: defaultSide, onChange: onSideChange, name: 'OrderTicket side' });
  const [quantityText, setQuantityText] = useState(defaultQuantity === undefined ? '' : defaultQuantity.toString());
  const [priceText, setPriceText] = useState(defaultPrice === undefined ? '' : minorUnitsToDecimal(defaultPrice, scale));
  const [touched, setTouched] = useState({ quantity: false, price: false });
  const [snapped, setSnapped] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const quantityRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  const derived = lowerLimit == null && upperLimit == null && previousClose != null && bandRate ? circuitLimits(previousClose, bandRate) : null;
  const lower = lowerLimit ?? derived?.lower ?? null;
  const upper = upperLimit ?? derived?.upper ?? null;

  const parsedQuantity = parseLocalizedDecimal(quantityText, { maxFractionDigits: 0 });
  const quantity = parsedQuantity.state === 'valid' ? BigInt(parsedQuantity.value) : null;
  const parsedPrice = parseLocalizedDecimal(priceText, { maxFractionDigits: scale, grouping: 'none' });
  const price = parsedPrice.state === 'valid' ? parseMinorUnits(parsedPrice.value, scale) : null;

  const issues = validateOrder({ quantity, price }, { tickSize, lotSize, minQuantity, maxQuantity, lowerLimit: lower, upperLimit: upper });
  const context: OrderIssueContext = {
    lot: count(lotSize), min: count(minQuantity ?? lotSize), max: maxQuantity === undefined ? '' : count(maxQuantity), tick: prices.format(tickSize),
    lower: lower === null ? '' : prices.format(lower), upper: upper === null ? '' : prices.format(upper),
  };
  const quantityIssue = issues.find((issue) => issue.startsWith('quantity'));
  const priceIssue = issues.find((issue) => issue.startsWith('price'));
  const estimate = quantity !== null && quantity > 0n && price !== null && price > 0n
    ? estimateNepseTrade({ side, quantity, price, investor, holdingDays, ...(side === 'sell' && costPerUnit !== undefined ? { costBasis: costPerUnit * quantity } : {}) }, feeSchedule)
    : null;

  const quantityLabel = quantity === null ? '' : count(quantity);
  const blocked = Boolean(disabledReason);

  const fill = (value: bigint) => {
    setPriceText(minorUnitsToDecimal(value, scale));
    setSnapped(null);
    setTouched((t) => ({ ...t, price: true }));
  };
  const finishPrice = () => {
    setTouched((t) => ({ ...t, price: true }));
    if (price === null || price <= 0n || isOnTick(price, tickSize)) return;
    let next = snapToTick(price, tickSize, 'half-up');
    // Snapping never pushes a price over a limit: step back inside the band instead.
    if (upper !== null && next > upper) next = snapToTick(upper, tickSize, 'floor');
    if (lower !== null && next < lower) next = snapToTick(lower, tickSize, 'ceil');
    setPriceText(minorUnitsToDecimal(next, scale));
    setSnapped(words.snapped(prices.format(next)));
  };
  const focusFirst = (list: readonly OrderIssue[]) => {
    const target = list[0]?.startsWith('quantity') ? quantityRef : priceRef;
    target.current?.querySelector('input')?.focus();
  };
  const order = (): OrderTicketOrder | null => (estimate && quantity !== null && price !== null ? { symbol, side, quantity, price, estimate } : null);

  const showQuantityIssue = quantityIssue && (touched.quantity || touched.price) ? words.issues[quantityIssue](context) : undefined;
  const showPriceIssue = priceIssue && touched.price ? words.issues[priceIssue](context) : undefined;
  const totalText = estimate ? amounts.format(estimate.total) : '';

  return (
    <form
      className={`pu-ticket${className ? ` ${className}` : ''}`}
      data-side={side}
      aria-labelledby={headingId}
      noValidate
      data-testid={testId}
      onSubmit={(event) => {
        event.preventDefault();
        if (blocked || busy) return;
        setTouched({ quantity: true, price: true });
        if (issues.length > 0) { focusFirst(issues); return; }
        const ready = order();
        if (!ready) return;
        if (confirm) setConfirming(true);
        else onSubmit(ready);
      }}
    >
      <Heading className="pu-ticket-title" id={headingId}>
        {words.title(side, symbol)}
      </Heading>
      <SegmentedControl<OrderSide>
        options={[{ value: 'buy', label: words.buy }, { value: 'sell', label: words.sell }]}
        value={side}
        onChange={(next) => { setSide(next); setConfirming(false); }}
        prefix={`${headingId.replace(/[^a-zA-Z0-9_-]/g, '')}-side`}
        label={words.side}
        fill
        size="lg"
        className="pu-ticket-side"
        testId={testId ? `${testId}-side` : undefined}
      />
      <div className="pu-ticket-fields">
        <div ref={quantityRef}>
          <NumberField
            integer
            label={words.quantity}
            value={quantityText}
            onChange={(text) => { setQuantityText(text); setConfirming(false); }}
            onBlur={() => setTouched((t) => ({ ...t, quantity: true }))}
            step={lotSize.toString()}
            min={(minQuantity ?? lotSize).toString()}
            max={maxQuantity?.toString()}
            steppers
            hint={words.lotHint(count(lotSize))}
            error={showQuantityIssue}
            testId={testId ? `${testId}-quantity` : undefined}
          />
        </div>
        <div ref={priceRef}>
          <NumberField
            label={words.price}
            value={priceText}
            maxFractionDigits={scale}
            grouping="none"
            onChange={(text) => { setPriceText(text); setSnapped(null); setConfirming(false); }}
            onBlur={finishPrice}
            step={minorUnitsToDecimal(tickSize, scale)}
            min={lower === null ? minorUnitsToDecimal(tickSize, scale) : minorUnitsToDecimal(snapToTick(lower, tickSize, 'ceil'), scale)}
            max={upper === null ? undefined : minorUnitsToDecimal(snapToTick(upper, tickSize, 'floor'), scale)}
            steppers
            hint={snapped ?? words.priceHint(lower !== null && upper !== null ? { lower: context.lower, upper: context.upper } : null, context.tick)}
            error={showPriceIssue}
            testId={testId ? `${testId}-price` : undefined}
          />
        </div>
      </div>
      {(ltp != null || lower !== null || upper !== null) && (
        <div className="pu-ticket-fill" role="group" aria-label={words.price}>
          {lower !== null && <button type="button" onClick={() => fill(snapToTick(lower, tickSize, 'ceil'))}><span>{words.lower}</span> <b>{prices.format(lower)}</b></button>}
          {ltp != null && <button type="button" onClick={() => fill(ltp)}><span>{words.ltp}</span> <b>{prices.format(ltp)}</b></button>}
          {upper !== null && <button type="button" onClick={() => fill(snapToTick(upper, tickSize, 'floor'))}><span>{words.upper}</span> <b>{prices.format(upper)}</b></button>}
        </div>
      )}
      <p className="kit-sr" role="status">{snapped ?? ''}</p>

      <section className="pu-ticket-estimate" aria-label={words.estimate}>
        <dl>
          <div><dt>{words.amount}</dt><dd>{estimate ? amounts.format(estimate.amount) : '—'}</dd></div>
          <div><dt>{words.commission}{estimate?.commissionRate ? <span className="pu-ticket-rate"> ({digits(percentOf(estimate.commissionRate))}%)</span> : null}</dt><dd>{estimate ? amounts.format(estimate.commission) : '—'}</dd></div>
          <div><dt>{words.sebon}</dt><dd>{estimate ? amounts.format(estimate.sebonFee) : '—'}</dd></div>
          {(estimate ? estimate.dpCharge > 0n : feeSchedule.dpChargeOn === 'both' || feeSchedule.dpChargeOn === side) && <div><dt>{words.dp}</dt><dd>{estimate ? amounts.format(estimate.dpCharge) : '—'}</dd></div>}
          {estimate?.capitalGainsTaxRate && <div><dt>{words.cgt}<span className="pu-ticket-rate"> ({digits(percentOf(estimate.capitalGainsTaxRate))}%)</span></dt><dd>{amounts.format(estimate.capitalGainsTax)}</dd></div>}
          <div className="pu-ticket-total"><dt>{side === 'buy' ? words.totalBuy : words.totalSell}</dt><dd data-testid={testId ? `${testId}-total` : undefined}>{estimate ? totalText : '—'}</dd></div>
        </dl>
        <p className="pu-ticket-note">{words.estimateNote}</p>
      </section>

      {blocked && <Note tone="warn">{disabledReason}</Note>}
      {confirming && estimate && quantity !== null && price !== null ? (
        <InlineConfirm
          className="pu-ticket-confirm"
          role="alertdialog"
          id={`${headingId.replace(/[^a-zA-Z0-9_-]/g, '')}-confirm`}
          title={words.confirmTitle(side, quantityLabel, symbol, prices.format(price))}
          body={words.confirmBody(side, totalText)}
          confirm={words.confirm(side)}
          cancel={words.back}
          busy={busy}
          size="md"
          confirmTestId={testId ? `${testId}-confirm` : undefined}
          onConfirm={() => {
            const ready = order();
            if (!ready) return;
            onSubmit(ready);
            setConfirming(false);
          }}
          onCancel={() => {
            setConfirming(false);
            requestAnimationFrame(() => submitRef.current?.focus());
          }}
        />
      ) : (
        <Button
          ref={submitRef}
          type="submit"
          variant={side === 'buy' ? 'primary' : 'danger'}
          size="lg"
          block
          loading={busy}
          disabled={blocked}
          testId={testId ? `${testId}-submit` : undefined}
          className="pu-ticket-submit"
        >
          {words.submit(side, quantityLabel, symbol).replace(/\s+/g, ' ').trim()}
        </Button>
      )}
    </form>
  );
}
