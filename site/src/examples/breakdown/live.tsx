import { useState } from 'react';
import { Breakdown, BreakdownRow } from '@punji/ui/breakdown';
import { formatNepalNumber } from '@punji/ui/nepal/format';
import { Stack } from '@punji/ui/stack';

const rs = (n: number) => `Rs ${formatNepalNumber(n)}`;

// `live` announces changes politely as the form is filled. The arithmetic is a stand-in: use your own rules.
export default function Example() {
  const [shares, setShares] = useState(100);
  const amount = shares * 1240;
  const commission = Math.round(amount * 0.004);
  return (
    <Stack>
      <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--pu-space-3)' }}>
        Shares to sell
        <input type="number" min={0} value={shares} onChange={(e) => setShares(Math.max(0, Number(e.target.value) || 0))} />
      </label>
      <Breakdown tone="tint" live>
        <BreakdownRow label="Sale amount" note={`${shares} shares at Rs 1,240`} value={rs(amount)} />
        <BreakdownRow label="Broker commission" note="0.40% of the amount" value={`- ${rs(commission)}`} tone="down" />
        <BreakdownRow label="You receive" total value={rs(amount - commission)} />
      </Breakdown>
    </Stack>
  );
}
