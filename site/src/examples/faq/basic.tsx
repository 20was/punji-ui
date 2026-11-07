import { Faq } from '@punji/ui/faq';
import { faqJsonLd, serializeJsonLd } from '@punji/ui/faq-json-ld';
import { useState } from 'react';

// One answer open at a time, the first to start with. `onValueChange` is the analytics hook: it gets the open ids and what
// just changed. `faqJsonLd` returns the FAQPage data for the same items; render it yourself in a script tag.
const items = [
  { q: 'How long does a transfer take?', a: 'Within the same bank, at once. To another bank, usually within a few minutes.' },
  { q: 'What is the daily limit?', a: 'NPR 500,000 to saved payees and NPR 50,000 to new payees.' },
  { q: 'Can I cancel a transfer?', a: <p>Only a scheduled transfer, until the day before it runs. <b>A sent transfer cannot be recalled.</b></p>, aText: 'Only a scheduled transfer, until the day before it runs. A sent transfer cannot be recalled.' },
];

export default function Example() {
  const [last, setLast] = useState('nothing yet');
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Faq
        eyebrow="Help"
        title="Questions about transfers"
        items={items}
        onValueChange={(open, change) => setLast(`${change.open ? 'opened' : 'closed'} question ${change.index + 1}; open: ${open.join(', ') || 'none'}`)}
      />
      <p role="status" style={{ margin: 0, fontSize: 13 }}>Analytics hook saw: {last}</p>
      <pre style={{ margin: 0, padding: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }} aria-label="FAQPage JSON-LD">{serializeJsonLd(faqJsonLd(items))}</pre>
    </div>
  );
}
