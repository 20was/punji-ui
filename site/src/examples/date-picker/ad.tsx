import { useState } from 'react';
import { DatePicker } from '@punji/ui/date-picker';

export default function Example() {
  const [value, setValue] = useState<string | null>('2025-11-14');
  return (
    <div className="ex-stack">
      <DatePicker label="Trade date" value={value} onChange={setValue} today="2025-11-14" max="2025-12-31" hint="Type YYYY-MM-DD or pick from the calendar" />
      <p className="doc-muted">Value: <code>{value ?? 'null'}</code> (date-only, never an instant)</p>
    </div>
  );
}
