import { useState } from 'react';
import { SymbolField } from '@punji/ui/fields';
import { symbols } from '../../sample.ts';

// The list is handed to the field: matching is in memory, so there is no request per keystroke.
export default function Example() {
  const [symbol, setSymbol] = useState('N');
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <SymbolField label="Symbol" value={symbol} onChange={setSymbol} options={symbols} placeholder="Type NABIL, NTC or a company name" hint="Arrow keys choose, Enter picks, Esc closes" />
    </div>
  );
}
