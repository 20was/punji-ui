import { cumulativeDepth, downsampleIndices, ema, niceTicks, rebase, sma, validateOhlc } from '@punji/ui/chart-math';
import { nabilCandles } from '../../sample.ts';

const closes = nabilCandles.map((c) => c.close);
const long = Array.from({ length: 5000 }, (_, i) => 100 + Math.sin(i / 40) * 10);
long[2500] = 160;

export default function Example() {
  const kept = downsampleIndices(long, 200);
  const rows: [string, string][] = [
    ['niceTicks(471.2, 493.5)', niceTicks(471.2, 493.5).ticks.join(', ')],
    ['sma(closes, 5).at(-1)', String(sma(closes, 5).at(-1)?.toFixed(2))],
    ['ema(closes, 5).at(-1)', String(ema(closes, 5).at(-1)?.toFixed(2))],
    ['rebase([200, 210, null, 190])', rebase([200, 210, null, 190]).join(', ')],
    ['validateOhlc(low above close)', validateOhlc({ open: 10, high: 12, low: 11, close: 10.5 }).join(', ')],
    ['downsampleIndices(5000 points, 200)', `${kept.length} kept, spike at 2500 kept: ${kept.includes(2500)}`],
    ['cumulativeDepth(asks)', cumulativeDepth([{ price: 488, quantity: 900 }, { price: 488.5, quantity: 1500 }], 'ask').map((d) => d.cumulative).join(', ')],
  ];
  return (
    <dl className="ex-grid">
      {rows.map(([call, out]) => (
        <div key={call}>
          <dt>{call}</dt>
          <dd>{out}</dd>
        </div>
      ))}
    </dl>
  );
}
