import { Sparkline } from '@punji/ui/sparkline';
import { sampleCloses } from '../../sample.ts';

// Default tone: gain when the last value is above the first, loss when below, flat when equal.
export default function Example() {
  const up = sampleCloses(487.5, 2);
  const down = sampleCloses(842, 1);
  return (
    <dl className="ex-grid">
      <div>
        <dt>Up (default tone)</dt>
        <dd><Sparkline values={up} label="NABIL, 30 closes" /></dd>
      </div>
      <div>
        <dt>Down (default tone)</dt>
        <dd><Sparkline values={down} label="NTC, 30 closes" /></dd>
      </div>
      <div>
        <dt>Flat</dt>
        <dd><Sparkline values={[10, 10, 10, 10]} label="Unchanged" /></dd>
      </div>
      <div>
        <dt>tone=&quot;chart&quot; (neutral)</dt>
        <dd><Sparkline values={up} tone="chart" width={120} height={32} /></dd>
      </div>
    </dl>
  );
}
