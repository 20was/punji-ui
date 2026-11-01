import { Card } from '@punji/ui/card';
import { Stack } from '@punji/ui/stack';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';

// Quote headers for a rise, a fall and an unchanged price. Direction is in the sign, the arrow and the spoken
// word, so it reads correctly without colour. Prices are paisa (bigint), the change is computed exactly.
const npr = nepalMoneyConfig();
const quotes = [
  { symbol: 'HDL', name: 'Himalayan Distillery', current: 215000n, previous: 210146n },
  { symbol: 'CHCL', name: 'Chilime Hydropower', current: 61230n, previous: 62890n },
  { symbol: 'SBL', name: 'Siddhartha Bank', current: 33120n, previous: 33120n },
];

export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))' }}>
      {quotes.map((q) => (
        <Card key={q.symbol} title={`${q.symbol} · ${q.name}`} headingLevel={3}>
          <Stack gap={2}>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <MoneyDisplay value={q.current} preset={npr} />
            </p>
            <PriceChange current={q.current} previous={q.previous} preset={npr} />
          </Stack>
        </Card>
      ))}
    </div>
  );
}
