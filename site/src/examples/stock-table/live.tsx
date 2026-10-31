import { useState } from 'react';
import { StockTable } from '@punji/ui/stock-table';
import { Button } from '@punji/ui/button';
import { quotes as base } from '../../sample.ts';
import { Cluster, Stack } from '@punji/ui/stack';

// Stand-in for your socket or query: each click hands the table new props.
export default function Example() {
  const [step, setStep] = useState(0);
  const quotes = base.slice(0, 5).map((q, i) => ({
    ...q,
    // 50 paisa per unit of a made-up movement
    ltp: q.ltp === null || step === 0 ? q.ltp : q.ltp + BigInt(((step * (i + 2)) % 7) - 3) * 50n,
  }));
  return (
    <Stack>
      <Cluster>
        <Button size="sm" variant="secondary" onClick={() => setStep((s) => s + 1)}>
          Receive a tick
        </Button>
      </Cluster>
      <StockTable caption="Live prices" quotes={quotes} columns={['symbol', 'ltp', 'change']} live />
    </Stack>
  );
}
