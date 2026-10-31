import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { LiveFigure } from '@punji/ui/live-figure';

// The value comes from props (see the Live data adapters guide). A change counts to the new value over
// 450 ms and tints once; under reduced motion the new value simply replaces the old.
export default function Example() {
  const [price, setPrice] = useState(487.5);
  const [symbol, setSymbol] = useState('NABIL');
  return (
    <div className="ex-stack">
      <p style={{ margin: 0, fontSize: 'var(--pu-text-lg)' }}>
        {symbol} <LiveFigure value={price} kind="rs" id={symbol} />
      </p>
      <div className="ex-row">
        <Button variant="secondary" onClick={() => setPrice((p) => Math.round((p + 4.75) * 100) / 100)}>
          Tick up
        </Button>
        <Button variant="secondary" onClick={() => setPrice((p) => Math.round((p - 3.25) * 100) / 100)}>
          Tick down
        </Button>
        {/* A different id is a different figure: it snaps, with no tween and no tint. */}
        <Button
          variant="ghost"
          onClick={() => {
            setSymbol('NTC');
            setPrice(842);
          }}
        >
          Switch to NTC
        </Button>
      </div>
    </div>
  );
}
