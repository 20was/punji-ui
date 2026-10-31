import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { Select } from '@punji/ui/select';

const npr = nepalMoneyConfig();
const periods = [
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' },
] as const;

type Period = (typeof periods)[number]['value'];

// Portfolio value now, and what it was at the start of each period (paisa).
const now = 94651050n;
const startOf: Record<Period, bigint> = { '1w': 93210000n, '1m': 95884000n, '1y': 81240000n, all: 62500000n };

export default function Example() {
  const [period, setPeriod] = useState<Period>('1m');
  return (
    <div className="ex-narrow">
      <Card
        title="Portfolio value"
        headingLevel={3}
        // The label's default placement is "hidden": it names the control for screen readers only.
        action={<Select<Period> label="Period" size="sm" value={period} onChange={setPeriod} options={periods} />}
      >
        <p className="ex-big">
          <MoneyDisplay value={now} preset={npr} />
        </p>
        <PriceChange current={now} previous={startOf[period]} preset={npr} />
      </Card>
    </div>
  );
}
