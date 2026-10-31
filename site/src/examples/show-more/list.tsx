import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { Figure } from '@punji/ui/figures';
import { ShowMore } from '@punji/ui/show-more';
import { holdings } from '../../sample.ts';

// ShowMore is the last line of a long list inside its card. You own the state, the count and the id of the list.
const PREVIEW = 5;

export default function Example() {
  const [all, setAll] = useState(false);
  const rows = all ? holdings : holdings.slice(0, PREVIEW);
  return (
    <div className="ex-narrow">
      <Card title="Holdings" description={`${holdings.length} companies`} headingLevel={3}>
        <ul id="holdings-list" className="ex-rows">
          {rows.map((h) => (
            <li key={h.symbol}>
              <span>
                <b>{h.symbol}</b>
                <small>{h.qty} shares</small>
              </span>
              <Figure value={h.qty * h.ltp} kind="rs" />
            </li>
          ))}
        </ul>
        <ShowMore expanded={all} onToggle={() => setAll(!all)} more={`Show all ${holdings.length}`} less="Show fewer" controls="holdings-list" />
      </Card>
    </div>
  );
}
