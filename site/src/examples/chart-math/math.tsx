import { ema, niceTicks, rebase, sma, validateOhlc } from '@punji/ui/chart-math';
import { Card } from '@punji/ui/card';
import { nabilCandles } from '../../sample.ts';

// A chart of your own: chart-math does the maths (round ticks, averages, percent change, data checks),
// your SVG does the drawing. Plain functions, no React, so they also run on a server or in a worker.
const closes = nabilCandles.map((c) => c.close);
const sma10 = sma(closes, 10);
const ema20 = ema(closes, 20);
const { ticks, lo, hi } = niceTicks(Math.min(...nabilCandles.map((c) => c.low)), Math.max(...nabilCandles.map((c) => c.high)), 5);
const change = rebase(closes).at(-1) ?? 0;
const bad = nabilCandles.filter((c) => validateOhlc(c).length > 0).length;

const W = 600;
const H = 200;
const x = (i: number) => (i / (closes.length - 1)) * W;
const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
// Averages start with nulls (not enough sessions yet); those points are skipped.
const points = (values: readonly (number | null)[]) =>
  values.flatMap((v, i) => (v === null ? [] : [`${x(i).toFixed(1)},${y(v).toFixed(1)}`])).join(' ');
const signed = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

export default function Example() {
  return (
    <div className="ex-medium">
      <Card title="NABIL, last 60 sessions" description={`Close ${signed} over the period`} headingLevel={3}>
        <div className="ex-chart">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`NABIL daily closes over 60 sessions, ${signed}, with a 10-session simple and a 20-session exponential average`}>
            {ticks.map((t) => (
              <line key={t} className="ex-chart-grid" x1={0} x2={W} y1={y(t)} y2={y(t)} />
            ))}
            <polyline className="ex-chart-line is-close" points={points(closes)} />
            <polyline className="ex-chart-line is-sma" points={points(sma10)} />
            <polyline className="ex-chart-line is-ema" points={points(ema20)} />
          </svg>
          {ticks.map((t) => (
            <span key={t} className="ex-chart-tick" style={{ top: `${((hi - t) / (hi - lo)) * 100}%` }} aria-hidden="true">
              {t.toFixed(0)}
            </span>
          ))}
        </div>
        <ul className="ex-legend" aria-label="Lines">
          <li className="is-close">Close</li>
          <li className="is-sma">SMA 10</li>
          <li className="is-ema">EMA 20</li>
        </ul>
        <p className="ex-label">{bad === 0 ? `validateOhlc: all ${nabilCandles.length} candles are consistent.` : `validateOhlc: ${bad} candles need a look.`}</p>
      </Card>
    </div>
  );
}
