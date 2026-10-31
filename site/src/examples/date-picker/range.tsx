import { useState } from 'react';
import { DateRangePicker } from '@punji/ui/date-picker';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [range, setRange] = useState<{ start: string; end: string | null } | null>(null);
  return (
    <Stack>
      <DateRangePicker label="Statement period" value={range} onChange={setRange} today="2025-11-14" />
      <p className="doc-muted">Value: <code>{range ? `${range.start} to ${range.end ?? '…'}` : 'null'}</code></p>
    </Stack>
  );
}
