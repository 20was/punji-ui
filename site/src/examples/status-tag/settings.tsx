import { Card } from '@punji/ui/card';
import { StatusTag } from '@punji/ui/status-tag';
import { RowList, ValueRow } from '@punji/ui/rows';

// A StatusTag is the state of a setting at the end of its row: read, never pressed. The words carry the state; the icon is extra.
const rows = [
  { name: 'Portfolio sharing', hint: 'Your accountant can see holdings', tag: <StatusTag icon="eye">View only</StatusTag> },
  { name: 'Contract notes by email', hint: 'After every trade', tag: <StatusTag tone="accent" icon="check">On</StatusTag> },
  { name: 'Price alerts', hint: 'Not set up yet', tag: <StatusTag>Off</StatusTag> },
  { name: 'Trading PIN', hint: 'Changed by the broker', tag: <StatusTag icon="lock">Staff only</StatusTag> },
];

export default function Example() {
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Card title="Account settings" headingLevel={3}>
        <RowList>
          {rows.map((r) => (
            <ValueRow key={r.name} title={r.name} line={r.hint} figure={r.tag} />
          ))}
        </RowList>
      </Card>
    </div>
  );
}
