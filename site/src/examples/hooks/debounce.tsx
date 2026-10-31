import { useState } from 'react';
import { Field } from '@punji/ui/fields';
import { useDebounce } from '@punji/ui/hooks';
import { holdings } from '../../sample.ts';

export default function Example() {
  const [text, setText] = useState('');
  const query = useDebounce(text, 300);
  const hits = holdings.filter((h) => `${h.symbol} ${h.name}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="ex-stack">
      <Field label="Search symbols" value={text} onChange={setText} hint="The list updates 300 ms after you stop typing" />
      <p className="doc-muted">Debounced query: <code>{query || '(empty)'}</code> · {hits.length} matches</p>
    </div>
  );
}
