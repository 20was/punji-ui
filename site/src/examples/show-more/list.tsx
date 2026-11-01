import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { Figure } from '@punji/ui/figures';
import { ShowMore } from '@punji/ui/show-more';
import { holdings } from '../../sample.ts';
import { RowList, ValueRow } from '@punji/ui/rows';

// ShowMore is the last line of a long list inside its card. You own the state, the count and the id of the list.
const PREVIEW = 5;

export default function Example() {
  const [all, setAll] = useState(false);
  const rows = all ? holdings : holdings.slice(0, PREVIEW);
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Card title="Holdings" description={`${holdings.length} companies`} headingLevel={3}>
        <RowList>
          {rows.map((h) => (
            <ValueRow key={h.symbol} title={h.symbol} line={<>{h.qty} shares</>} figure={<Figure value={h.qty * h.ltp} kind="rs" />} />
          ))}
        </RowList>
        <ShowMore expanded={all} onToggle={() => setAll(!all)} more={`Show all ${holdings.length}`} less="Show fewer" controls="holdings-list" />
      </Card>
    </div>
  );
}
