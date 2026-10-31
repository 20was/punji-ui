import { useState } from 'react';
import { Select } from '@punji/ui/select';

const periods = [
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' },
] as const;

type Period = (typeof periods)[number]['value'];

export default function Example() {
  const [period, setPeriod] = useState<Period>('1m');
  return (
    <div className="ex-row">
      {/* The default placement is "hidden": the label names the control for screen readers only. */}
      <Select<Period> label="Period" value={period} onChange={setPeriod} options={periods} />
      <span className="doc-muted">Chosen: {period}</span>
    </div>
  );
}
