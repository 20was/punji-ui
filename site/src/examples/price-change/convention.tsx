import { Card } from '@punji/ui/card';
import { Stack } from '@punji/ui/stack';
import { PriceChange } from '@punji/ui/price-change';

// The same moves under the green-up convention (most markets) and red-up (some markets, such as China and Korea).
// Only the colour changes; the arrow, sign and spoken words stay. Labels translate, here into Nepali.
const moves = [
  { label: 'Up 5.5%', current: 10550n, previous: 10000n },
  { label: 'Down 10%', current: 9000n, previous: 10000n },
];

export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))' }}>
      <Card title="Green up" headingLevel={3}>
        <Stack gap={2}>
        {moves.map((m) => (
          <PriceChange key={m.label} current={m.current} previous={m.previous} currency="USD" locale="en-US" />
        ))}
        </Stack>
      </Card>
      <Card title="Red up" headingLevel={3}>
        <Stack gap={2}>
        {moves.map((m) => (
          <PriceChange key={m.label} current={m.current} previous={m.previous} currency="USD" locale="en-US" convention="red-up" />
        ))}
        </Stack>
      </Card>
      <Card title={<span lang="ne">Spoken in Nepali</span>} headingLevel={3}>
        <Stack gap={2}>
        <PriceChange current={10550n} previous={10000n} currency="NPR" locale="en-IN" labels={{ up: 'बढ्यो', down: 'घट्यो', flat: 'उस्तै' }} />
        <PriceChange current={9000n} previous={10000n} currency="NPR" locale="en-IN" labels={{ up: 'बढ्यो', down: 'घट्यो', flat: 'उस्तै' }} />
        </Stack>
      </Card>
    </div>
  );
}
