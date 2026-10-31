import { Button } from '@punji/ui/button';
import { Dock } from '@punji/ui/overlay';
import { holdings } from '../../sample.ts';

// Dock keeps the page's one main action in reach at the bottom while a long list scrolls (it is position: sticky).
export default function Example() {
  return (
    <div className="ex-narrow" style={{ maxHeight: 280, overflowY: 'auto', paddingInline: 12 }}>
      <ul className="ex-rows">
        {holdings.map((h) => (
          <li key={h.symbol}>
            <b>{h.symbol}</b>
            <span>{h.qty} shares</span>
          </li>
        ))}
      </ul>
      <Dock>
        <Button>Review order</Button>
        <Button variant="secondary">Save draft</Button>
      </Dock>
    </div>
  );
}
