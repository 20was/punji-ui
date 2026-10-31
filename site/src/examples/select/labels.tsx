import { useState } from 'react';
import { Select } from '@punji/ui/select';

const options = [
  { value: 'all', label: 'All sectors' },
  { value: 'bank', label: 'Commercial banks' },
  { value: 'hydro', label: 'Hydropower' },
  { value: 'insurance', label: 'Life insurance' },
];

export default function Example() {
  const [above, setAbove] = useState('all');
  const [inline, setInline] = useState('bank');
  const [size, setSize] = useState('hydro');
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Select label="Sector" labelPlacement="above" value={above} onChange={setAbove} options={options} />
        <Select label="Sector" labelPlacement="inline" value={inline} onChange={setInline} options={options} />
      </div>
      <div className="ex-row">
        {(['sm', 'md', 'lg'] as const).map((s) => (
          <Select key={s} label={`Size ${s}`} size={s} value={size} onChange={setSize} options={options} />
        ))}
      </div>
      <Select label="Full width" labelPlacement="above" block value={above} onChange={setAbove} options={options} />
    </div>
  );
}
