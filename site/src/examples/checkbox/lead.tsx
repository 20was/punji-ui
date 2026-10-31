import { useState } from 'react';
import { Checkbox } from '@punji/ui/checkbox';

const swatch = (color: string) => <i aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />;

// lead: before the words (a series swatch). end: after them (a count). disabled: listed but not choosable.
export default function Example() {
  const [state, setState] = useState({ nepse: true, sensitive: false, banking: false });
  const set = (key: keyof typeof state) => (on: boolean) => setState((s) => ({ ...s, [key]: on }));
  return (
    <fieldset className="ex-stack" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend>Lines on the chart</legend>
      <Checkbox checked={state.nepse} onChange={set('nepse')} lead={swatch('var(--pu-color-series-nepse)')} end="2,684.1">
        NEPSE index
      </Checkbox>
      <Checkbox checked={state.sensitive} onChange={set('sensitive')} lead={swatch('var(--pu-color-series-3)')} end="460.2">
        Sensitive index
      </Checkbox>
      <Checkbox checked={state.banking} onChange={set('banking')} lead={swatch('var(--pu-color-series-4)')} disabled end="Soon">
        Banking sub-index
      </Checkbox>
    </fieldset>
  );
}
