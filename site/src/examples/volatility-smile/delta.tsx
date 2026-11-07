import { VolatilitySmile } from '@punji/ui/volatility-smile';

// By delta instead of strike, without the grid (a hidden table still lists every value for assistive technology).
export default function Example() {
  return (
    <VolatilitySmile
      label="Implied volatility by delta"
      xKind="delta"
      grid={false}
      curves={[
        { key: '1m', label: '1 month', points: [{ x: '0.10', iv: '21.50' }, { x: '0.25', iv: '17.25' }, { x: '0.50', iv: '14.80' }, { x: '0.75', iv: '15.60' }, { x: '0.90', iv: '18.90' }] },
        { key: '3m', label: '3 months', points: [{ x: '0.10', iv: '22.10' }, { x: '0.25', iv: '18.40' }, { x: '0.50', iv: '16.20' }, { x: '0.75', iv: '16.70' }, { x: '0.90', iv: '19.35' }] },
      ]}
    />
  );
}
