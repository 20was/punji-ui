import { useState } from 'react';
import { SegmentedControl } from '@punji/ui/controls';

type Window = '1d' | '1w' | '1m' | '1y';
const options: { value: Window; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
];

// With no panelId this is a toggle group: each segment is a button with aria-pressed.
export default function Example() {
  const [window, setWindow] = useState<Window>('1m');
  return (
    <div className="ex-stack">
      <SegmentedControl<Window> label="Chart window" prefix="seg-basic" value={window} onChange={setWindow} options={options} />
      <SegmentedControl<Window> label="Chart window, full width" prefix="seg-fill" fill value={window} onChange={setWindow} options={options} />
      <div className="ex-row">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <SegmentedControl<Window> key={size} label={`Window, ${size}`} prefix={`seg-${size}`} size={size} value={window} onChange={setWindow} options={options} />
        ))}
      </div>
    </div>
  );
}
