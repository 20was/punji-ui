import { useState } from 'react';
import { IdNumberInput } from '@punji/ui/id-number-input';

// Letters are refused as you type; Devanagari digits become ASCII. The shape message appears once you leave the field.
export default function Example() {
  const [pan, setPan] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [state, setState] = useState('empty');
  return (
    <div className="ex-narrow" style={{ display: 'grid', gap: 16 }}>
      <IdNumberInput kind="pan" label="PAN" value={pan} onValueChange={(text, result) => { setPan(text); setState(result.state); }} />
      <IdNumberInput kind="citizenship" label="Citizenship certificate number" value={citizenship} onValueChange={(text) => setCitizenship(text)} />
      <p className="doc-muted">PAN check: <code>{state}</code></p>
    </div>
  );
}
