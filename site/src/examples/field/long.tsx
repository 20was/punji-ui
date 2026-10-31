import { useState } from 'react';
import { DateField, SelectField, TextAreaField } from '@punji/ui/fields';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [type, setType] = useState('buy');
  const [date, setDate] = useState('2082-07-14');
  const [note, setNote] = useState('');
  return (
    <Stack className="ex-narrow">
      <SelectField
        label="Transaction type"
        value={type}
        onChange={setType}
        options={[
          { value: 'buy', label: 'Buy' },
          { value: 'sell', label: 'Sell' },
          { value: 'bonus', label: 'Bonus shares' },
        ]}
      />
      {/* DateField is the native date input: its value is always YYYY-MM-DD. */}
      <DateField label="Trade date" value={date} onChange={setDate} />
      <TextAreaField label="Note" rows={3} value={note} onChange={setNote} hint={`${note.length} of 200 characters`} maxLength={200} />
    </Stack>
  );
}
