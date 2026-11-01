import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { RiskMeter, riskLevelLabels } from '@punji/ui/risk-meter';

// A fund page's dial and the compact steps for a fund list. The level comes from the fund's offer document.
export default function Example() {
  const [level, setLevel] = useState('4');
  const n = Number(level);
  return (
    <Card title="Himal Equity Growth Fund" headingLevel={3}>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
        <SegmentedControl label="Risk level" prefix="risk-level" size="sm" wrap value={level} onChange={setLevel} options={riskLevelLabels.map((_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
        <RiskMeter level={n} caption={`Your principal will be at ${riskLevelLabels[n - 1]!.toLowerCase()} risk.`} />
        <RiskMeter level={n} variant="bar" />
      </div>
    </Card>
  );
}
