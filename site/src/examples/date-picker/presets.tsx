import { useMemo, useState } from 'react';
import { DateRangePicker } from '@punji/ui/date-picker';
import { nepalDateRangePresets } from '@punji/ui/date-range-presets/nepal';

const TODAY = '2025-11-14';

export default function Example() {
  const [range, setRange] = useState<{ start: string; end: string | null } | null>(null);
  const presets = useMemo(() => nepalDateRangePresets({ today: TODAY, calendar: 'gregory' }), []);
  return (
    <div className="ex-stack">
      <DateRangePicker label="Statement period" value={range} onChange={setRange} today={TODAY} presets={presets} />
      <p className="doc-muted">Value: <code>{range ? `${range.start} to ${range.end ?? '…'}` : 'null'}</code></p>
    </div>
  );
}
