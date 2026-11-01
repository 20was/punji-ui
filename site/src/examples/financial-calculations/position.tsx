import { breakEvenPrice, computePosition, taxOnGain, valuePosition, type Trade } from '@punji/ui/calculations';
import { Card } from '@punji/ui/card';
import { KeyStats } from '@punji/ui/key-stats';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { Stack } from '@punji/ui/stack';

const npr = nepalMoneyConfig();
const ltp = 61_000n; // Rs 610.00, in paisa

// Prices and fees are bigint paisa; quantity is a whole number of shares.
const trades: Trade[] = [
  { side: 'buy', quantity: 100n, price: 50_000n, fees: 1_000n }, // 100 @ Rs 500.00
  { side: 'buy', quantity: 10n, price: 0n }, // bonus shares
  { side: 'sell', quantity: 50n, price: 70_000n, fees: 900n }, // 50 @ Rs 700.00
];

export default function Example() {
  const position = computePosition(trades, { method: 'fifo', rounding: 'half-even' });
  const value = valuePosition(position, ltp);
  const breakEven = breakEvenPrice(position.costBasis, position.quantity, { sellRate: '0.004' });
  // Illustrative rate only. Take real rates from a verified, current source.
  const tax = taxOnGain(position.realisedPnL, { rate: '0.05', rounding: 'half-up' });
  const money = (minor: bigint | null) => <MoneyDisplay value={minor} preset={npr} />;
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Card title="NABIL position" description={`${position.quantity} shares at Rs 610.00`} headingLevel={3}>
        <Stack>
          <div>
            <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>Market value</p>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{money(value.marketValue)}</p>
            <PriceChange current={value.marketValue} previous={position.costBasis} preset={npr} />
          </div>
          <KeyStats
            label="Position details"
            empty="Not known"
            items={[
              { label: 'Average cost', value: money(position.averageCost), sub: 'FIFO, bonus lot at zero' },
              { label: 'Cost basis', value: money(position.costBasis) },
              { label: 'Realised P&L', value: money(position.realisedPnL), tone: position.realisedPnL < 0n ? 'down' : 'up' },
              { label: 'Fees paid', value: money(position.totalFees) },
              { label: 'Break-even', value: money(breakEven), sub: 'After a 0.4% selling cost' },
              { label: 'Tax on the gain', value: money(tax), sub: 'At an illustrative 5%' },
            ]}
          />
        </Stack>
      </Card>
    </div>
  );
}
