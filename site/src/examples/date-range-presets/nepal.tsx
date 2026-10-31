import { useMemo, useState } from 'react';
import { DateRangePicker } from '@punji/ui/date-picker';
import { nepalDateRangePresets } from '@punji/ui/date-range-presets/nepal';

// `today` comes from your clock in Asia/Kathmandu (instantToNepalDate); fixed here so the page always shows the same ranges.
const TODAY = '2026-11-01';

export default function Example() {
  const [range, setRange] = useState<{ start: string; end: string | null } | null>(null);
  const presets = useMemo(() => nepalDateRangePresets({ today: TODAY, language: 'ne' }), []);
  return (
    <div className="ex-stack">
      <DateRangePicker label="कारोबार अवधि" value={range} onChange={setRange} today={TODAY} calendar="bikram-sambat" language="ne" digits="deva" presets={presets} />
      <p className="doc-muted">Value: <code>{range ? `${range.start} to ${range.end ?? '…'}` : 'null'}</code> (Gregorian, whatever calendar is shown)</p>
    </div>
  );
}
