import { Sparkline } from '@punji/ui/sparkline';
import { sampleCloses } from '../../sample.ts';

// Gaps are dropped (not zero). Fewer than two real values draw a dashed rule. Long series keep their spikes.
const long = sampleCloses(500, 3, 400);
long[200] = 700;

export default function Example() {
  return (
    <dl className="ex-grid">
      <div>
        <dt>Missing values dropped</dt>
        <dd><Sparkline values={[10, null, 12, undefined, Number.NaN, 15, 14]} /></dd>
      </div>
      <div>
        <dt>One value</dt>
        <dd><Sparkline values={[42]} /></dd>
      </div>
      <div>
        <dt>No data</dt>
        <dd><Sparkline values={[]} /></dd>
      </div>
      <div>
        <dt>400 points, spike kept (maxPoints 60)</dt>
        <dd><Sparkline values={long} maxPoints={60} label="400 closes with one spike" /></dd>
      </div>
      <div>
        <dt>fluid</dt>
        <dd><Sparkline values={sampleCloses(300, 6)} fluid width={240} height={48} label="Fills its cell" /></dd>
      </div>
    </dl>
  );
}
