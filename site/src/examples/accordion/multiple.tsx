import { useState } from 'react';
import { Accordion } from '@punji/ui/accordion';

// Multiple, controlled: any number open. The page owns the open ids, so it can also open a section from outside.
export default function Example() {
  const [open, setOpen] = useState<string[]>(['eligibility']);
  return (
    <div style={{ display: 'grid', gap: 8, width: 'min(100%, 480px)' }}>
      <Accordion
        type="multiple"
        headingLevel={4}
        value={open}
        onValueChange={setOpen}
        items={[
          { id: 'eligibility', header: 'Who can apply', children: <p>Nepali citizens aged 18 to 60 with a salary account for six months.</p> },
          { id: 'rate', header: 'Interest rate', children: <p>11.5% a year on the reducing balance, reviewed every quarter.</p> },
          { id: 'documents', header: 'Documents', children: <p>Citizenship certificate, a photo and three months of salary statements.</p> },
        ]}
      />
      <p role="status">{open.length} of 3 open</p>
    </div>
  );
}
