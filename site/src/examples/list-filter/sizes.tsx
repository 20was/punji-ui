import { useState } from 'react';
import { ListFilter } from '@punji/ui/list-filter';

export default function Example() {
  const [a, setA] = useState('');
  const [b, setB] = useState('NABIL');
  return (
    <div className="ex-stack">
      {/* lg is 44px with 16px text so a phone does not zoom on focus; the label sits above. */}
      <ListFilter size="lg" labelPlacement="above" value={a} onChange={setA} label="Search companies" clear="Clear search" testId="lf-lg" placeholder="Symbol or name" />
      {/* selectOnFocus: typing replaces the example text. */}
      <ListFilter selectOnFocus value={b} onChange={setB} label="Search symbols" clear="Clear search" testId="lf-md" />
    </div>
  );
}
