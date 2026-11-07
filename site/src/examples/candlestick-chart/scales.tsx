import { useState } from 'react';
import { CandlestickChart, type CandlestickScale } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { priceScales } from '@punji/ui/price-scales';
import { nabilCandles, performanceDates, performanceSeries } from '../../sample.ts';

// `scale` is linear (with `scales={priceScales}` from `@punji/ui/price-scales`, which keeps the log, percent and indexed maths out of a plain chart), log, percent (change from the first close) or indexed (first close is 100). `compare` draws
// other instruments over the price, each starting level with it on its first date; a linear or log axis becomes
// percent while something is compared, and a legend names every line. The table adds one column per compared series.
const SCALES: readonly CandlestickScale[] = ['linear', 'log', 'percent', 'indexed'];
const nepse = performanceSeries[1]!;
const compare = [{ label: nepse.label, points: performanceDates.map((date, i) => ({ date, close: nepse.values[i] ?? null })) }];

export default function Example() {
  const [scale, setScale] = useState<CandlestickScale>('percent');
  const [withCompare, setWithCompare] = useState(true);
  return (
    <Card title="NABIL against the index" description="Scale and compare">
      <div role="group" aria-label="Price scale" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {SCALES.map((s) => (
          <button key={s} type="button" className="kit-ct-toggle" aria-pressed={scale === s} onClick={() => setScale(s)}>
            {s}
          </button>
        ))}
        <button type="button" className="kit-ct-toggle" aria-pressed={withCompare} onClick={() => setWithCompare((v) => !v)}>
          Compare
        </button>
      </div>
      <CandlestickChart label="NABIL" candles={nabilCandles} scales={priceScales} scale={scale} compare={withCompare ? compare : undefined} volume={false} height={260} />
    </Card>
  );
}
