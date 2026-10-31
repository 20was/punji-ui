import { Card } from '@punji/ui/card';
import { CardLink } from '@punji/ui/card-link';
import { StatusPill } from '@punji/ui/status-pill';
import { Button } from '@punji/ui/button';
import { FactList } from '@punji/ui/fact-list';

const facts = [
  { label: 'Invested', value: 'Rs 9,80,000' },
  { label: 'Worth now', value: 'Rs 12,48,000' },
];

// Title, description, meta, one action. Rows inside a card are separated by hairlines, never by another card.
export default function Example() {
  return (
    <div className="ex-grid">
      <Card title="Holdings" description="As of the 14 Nov close" meta="14" action={<CardLink href="#/card">Open portfolio</CardLink>}>
        <FactList facts={facts} />
      </Card>
      <Card title="Alerts" action={<StatusPill tone="warn">2 triggered</StatusPill>} rule>
        <FactList facts={[{ label: 'NABIL above', value: 'Rs 490' }]} />
      </Card>
      <Card
        title="Nabil Bank Limited and its very long registered description"
        description="Nabil Bank Limited, a commercial bank licensed by Nepal Rastra Bank (clipped to one line)"
        clipDescription
        headingLevel={3}
        footer={<Button size="sm" variant="secondary">Edit</Button>}
      >
        <FactList facts={facts} />
      </Card>
    </div>
  );
}
