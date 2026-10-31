import { Card } from '@punji/ui/card';
import { StatusTag } from '@punji/ui/status-tag';

// A StatusTag is the state of a setting at the end of its row: read, never pressed. The words carry the state; the icon is extra.
const rows = [
  { name: 'Portfolio sharing', hint: 'Your accountant can see holdings', tag: <StatusTag icon="eye">View only</StatusTag> },
  { name: 'Contract notes by email', hint: 'After every trade', tag: <StatusTag tone="accent" icon="check">On</StatusTag> },
  { name: 'Price alerts', hint: 'Not set up yet', tag: <StatusTag>Off</StatusTag> },
  { name: 'Trading PIN', hint: 'Changed by the broker', tag: <StatusTag icon="lock">Staff only</StatusTag> },
];

export default function Example() {
  return (
    <div className="ex-narrow">
      <Card title="Account settings" headingLevel={3}>
        <ul className="ex-rows">
          {rows.map((r) => (
            <li key={r.name}>
              <span>
                <b>{r.name}</b>
                <small>{r.hint}</small>
              </span>
              {r.tag}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
