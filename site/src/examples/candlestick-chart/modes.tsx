import { useState } from 'react';
import { CandlestickChart, type CandlestickMode } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { nabilCandles } from '../../sample.ts';

// `mode` picks how the same sessions are drawn. Heikin Ashi smooths the candles (TradingView's construction rules,
// `heikinAshi()` in chart-math) and the table and readout print its exact values next to the real close; hollow
// follows TradingView too: the body is hollow when the close is above the open, the colour follows the previous close.
// Every mode says up, down or unchanged in words, in the readout, the live region and the table.
const MODES: readonly { id: CandlestickMode; name: string }[] = [
  { id: 'candles', name: 'Candles' },
  { id: 'hollow', name: 'Hollow' },
  { id: 'bars', name: 'Bars' },
  { id: 'heikin-ashi', name: 'Heikin Ashi' },
  { id: 'line', name: 'Line' },
  { id: 'area', name: 'Area' },
  { id: 'baseline', name: 'Baseline' },
  { id: 'high-low', name: 'High-low' },
];
const recent = nabilCandles.slice(-40);

export default function Example() {
  const [mode, setMode] = useState<CandlestickMode>('hollow');
  return (
    <Card title="NABIL, last 40 sessions" description="Pick a mode; the data is the same.">
      <div role="group" aria-label="Chart type" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {MODES.map((m) => (
          <button key={m.id} type="button" className="kit-ct-toggle" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
      <CandlestickChart label={`NABIL, ${MODES.find((m) => m.id === mode)!.name}`} candles={recent} mode={mode} height={240} />
    </Card>
  );
}
