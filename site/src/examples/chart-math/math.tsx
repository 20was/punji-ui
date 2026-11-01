import { ema, niceTicks, rebase, sma, validateOhlc } from '@punji/ui/chart-math';
import { Card } from '@punji/ui/card';
import { Cluster } from '@punji/ui/stack';
import { nabilCandles } from '../../sample.ts';

// A chart of your own: chart-math does the maths (round ticks, averages, percent change, data checks),
// your SVG does the drawing. Plain functions, no React, so they also run on a server or in a worker.
const closes = nabilCandles.map((c) => c.close);
const sma10 = sma(closes, 10);
const ema20 = ema(closes, 20);
const { ticks, lo, hi } = niceTicks(Math.min(...nabilCandles.map((c) => c.low)), Math.max(...nabilCandles.map((c) => c.high)), 5);
const change = rebase(closes).at(-1) ?? 0;
const bad = nabilCandles.filter((c) => validateOhlc(c).length > 0).length;

const CLOSE = 'var(--pu-color-chart)';
const SMA = 'var(--pu-color-series-nepse)';
const EMA = 'var(--pu-color-series-3)';

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
    <div style={{ width: 'min(100%, 720px)', marginInline: 'auto' }}>
      <Card title="NABIL, last 60 sessions" description={`Close ${signed} over the period`} headingLevel={3}>
        <div style={{ position: 'relative', height: 200, margin: '4px 0 10px', paddingRight: 40 }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`NABIL daily closes over 60 sessions, ${signed}, with a 10-session simple and a 20-session exponential average`} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}>
            {ticks.map((t) => (
              <line key={t} stroke="var(--pu-color-border-default)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" x1={0} x2={W} y1={y(t)} y2={y(t)} />
            ))}
            <polyline fill="none" stroke={CLOSE} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={points(closes)} />
            <polyline fill="none" stroke={SMA} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={points(sma10)} />
            <polyline fill="none" stroke={EMA} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={points(ema20)} />
          </svg>
          {ticks.map((t) => (
            <span key={t} style={{ position: 'absolute', right: 0, transform: 'translateY(-50%)', fontSize: 11.5, lineHeight: 1, color: 'var(--pu-color-text-muted)', fontVariantNumeric: 'tabular-nums', top: `${((hi - t) / (hi - lo)) * 100}%` }} aria-hidden="true">
              {t.toFixed(0)}
            </span>
          ))}
        </div>
        <Cluster as="ul" gap={3} aria-label="Lines" style={{ margin: '0 0 8px', fontSize: 12.5, color: 'var(--pu-color-text-muted)' }}>
          {[
            ['Close', CLOSE],
            ['SMA 10', SMA],
            ['EMA 20', EMA],
          ].map(([name, color]) => (
            <Cluster as="li" key={name} gap={2}>
              <span aria-hidden="true" style={{ width: 14, height: 2, borderRadius: 2, background: color }} />
              {name}
            </Cluster>
          ))}
        </Cluster>
        <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>{bad === 0 ? `validateOhlc: all ${nabilCandles.length} candles are consistent.` : `validateOhlc: ${bad} candles need a look.`}</p>
      </Card>
    </div>
  );
}
