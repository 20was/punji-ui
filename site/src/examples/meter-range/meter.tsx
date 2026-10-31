import { MeterBar } from '@punji/ui/meter';

// Decorative by default: the figures are printed beside it. Give `label` to make the bar an image instead.
export default function Example() {
  return (
    <div className="ex-stack">
      <div>
        <p>Return 27.3% on cost, of which dividends 4.1%</p>
        <MeterBar parts={[{ value: 23.2, tone: 'gain' }, { value: 4.1, tone: 'chart' }]} max={40} marker={15} />
        <p>Marker: benchmark 15%</p>
      </div>
      <div>
        <p>Proceeds Rs 1,23,503 of Rs 1,24,000 (fees Rs 497)</p>
        <MeterBar parts={[{ value: 99.6, tone: 'neutral' }, { value: 0.4, tone: 'loss' }]} max={100} />
      </div>
      <MeterBar label="Used 72 percent of the limit" parts={[{ value: 72, tone: 'chart' }]} max={100} />
    </div>
  );
}
