import { useMemo, useState } from 'react';
import { DateRangePicker } from '@punji/ui/date-picker';
import { dateRangePresets } from '@punji/ui/date-range-presets';

const TODAY = '2026-11-04';

export default function Example() {
  const [range, setRange] = useState<{ start: string; end: string | null } | null>(null);
  // A fiscal year that starts on 1 July, weeks that start on Monday.
  const presets = useMemo(
    () => dateRangePresets({ today: TODAY, weekStartsOn: 1, fiscalYearStartMonth: 7, ids: ['today', 'this-week', 'this-month', 'last-30-days', 'fiscal-year-to-date'] }),
    [],
  );
  return (
    <div className="ex-stack">
      <DateRangePicker label="Trade period" value={range} onChange={setRange} today={TODAY} weekStartsOn={1} presets={presets} />
      <p className="doc-muted">Value: <code>{range ? `${range.start} to ${range.end ?? '…'}` : 'null'}</code></p>
    </div>
  );
}
