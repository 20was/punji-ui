import { VolatilitySmile } from '@punji/ui/volatility-smile';

// Implied volatilities you computed elsewhere, as percent decimal strings. Nothing here prices an option.
export default function Example() {
  return (
    <VolatilitySmile
      label="Index options implied volatility by strike"
      reference={{ x: '22140', label: 'Spot' }}
      curves={[
        { key: 'nov', label: '28 Nov', points: [{ x: '21500', iv: '17.80' }, { x: '21750', iv: '16.10' }, { x: '22000', iv: '14.95' }, { x: '22250', iv: '14.20' }, { x: '22500', iv: '14.60' }] },
        { key: 'dec', label: '26 Dec', points: [{ x: '21500', iv: '18.40' }, { x: '21750', iv: '17.15' }, { x: '22000', iv: '16.30' }, { x: '22250', iv: '15.85' }, { x: '22500', iv: '16.05' }] },
        { key: 'jan', label: '30 Jan', points: [{ x: '21500', iv: '19.10' }, { x: '22000', iv: '17.40' }, { x: '22500', iv: '17.25' }] },
      ]}
    />
  );
}
