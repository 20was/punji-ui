import { bracketScale, valueScale } from '@punji/ui/chart-scale';
import { Card } from '@punji/ui/card';
import { weeklyValue } from '../../sample.ts';

// valueScale brackets the value line with round ticks (top tick labelled) and says where a second series sits when it is far off the plot.
const values = weeklyValue.flatMap((w) => (w.value === null ? [] : [w.value]));
const invested = [400_000, 400_000, 400_000, 400_000, 400_000];
const frame = { height: 200, top: 8, bottom: 8 };
const { scale, off } = valueScale(values, invested, frame);
const flat = bracketScale(1_000_000, 1_000_000, frame);

const W = 600;
const x = (i: number) => (i / (weeklyValue.length - 1)) * W;
const line = weeklyValue
  .flatMap((w, i) => (w.value === null ? [] : [`${x(i).toFixed(1)},${scale.y(w.value).toFixed(1)}`]))
  .join(' ');
const lakh = (v: number) => `${(v / 100_000).toFixed(1)} L`;

export default function Example() {
  return (
    <div className="ex-medium">
      <Card title="Portfolio value, 5 weeks" description={off ? `Invested (NPR 4 L) is ${off} the plot, so it is named, not drawn` : 'Value and invested'} headingLevel={3}>
        <div className="ex-chart">
          <svg viewBox={`0 0 ${W} 200`} preserveAspectRatio="none" role="img" aria-label={`Portfolio value from ${lakh(values[0] ?? 0)} to ${lakh(values.at(-1) ?? 0)}; week 3 has no value`}>
            {scale.ticks.map((t) => (
              <line key={t} className="ex-chart-grid" x1={0} x2={W} y1={scale.y(t)} y2={scale.y(t)} />
            ))}
            <polyline className="ex-chart-line is-close" points={line} />
          </svg>
          {scale.ticks.map((t) => (
            <span key={t} className="ex-chart-tick" style={{ top: `${(scale.y(t) / 200) * 100}%` }} aria-hidden="true">
              {lakh(t)}
            </span>
          ))}
        </div>
        <p className="ex-label">A flat series still gets a range: {flat.ticks.map(lakh).join(', ')}.</p>
      </Card>
    </div>
  );
}
