import { useState } from 'react';
import { DatePicker } from '@punji/ui/date-picker';

export default function Example() {
  const [value, setValue] = useState<string | null>('2025-11-14');
  return (
    <div className="ex-stack">
      <DatePicker label="मिति" calendar="bikram-sambat" language="ne" digits="deva" value={value} onChange={setValue} today="2025-11-14" />
      <p className="doc-muted">The stored value is still the Gregorian ISO date: <code>{value ?? 'null'}</code></p>
    </div>
  );
}
