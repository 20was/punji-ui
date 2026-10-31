import { computePosition, valuePosition, breakEvenPrice, taxOnGain, type Trade } from '@punji/ui/calculations';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

const preset = nepalMoneyConfig();

// Prices and fees are bigint paisa; quantity is a whole number of shares.
const trades: Trade[] = [
  { side: 'buy', quantity: 100n, price: 50_000n, fees: 1_000n }, // 100 @ 500.00
  { side: 'buy', quantity: 10n, price: 0n }, // bonus shares
  { side: 'sell', quantity: 50n, price: 70_000n, fees: 900n },
];

export default function Example() {
  const position = computePosition(trades, { method: 'fifo', rounding: 'half-even' });
  const value = valuePosition(position, 61_000n);
  const breakEven = breakEvenPrice(position.costBasis, position.quantity, { sellRate: '0.004' });
  // Illustrative rate only. Take real rates from a verified, current source.
  const tax = taxOnGain(position.realisedPnL, { rate: '0.05', rounding: 'half-up' });
  const rows: [string, bigint | null][] = [
    ['Cost basis', position.costBasis],
    ['Realised P&L', position.realisedPnL],
    ['Total fees', position.totalFees],
    ['Average cost', position.averageCost],
    ['Market value at 610.00', value.marketValue],
    ['Unrealised P&L', value.unrealisedPnL],
    ['Break-even price (0.4% sell cost)', breakEven],
    ['Tax at an illustrative 5%', tax],
  ];
  return (
    <dl className="ex-grid">
      <div><dt>Shares held</dt><dd>{position.quantity.toString()}</dd></div>
      {rows.map(([label, amount]) => (
        <div key={label}><dt>{label}</dt><dd><MoneyDisplay value={amount} preset={preset} /></dd></div>
      ))}
    </dl>
  );
}
