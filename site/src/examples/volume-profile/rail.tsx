import { ProfileRail } from '@punji/ui/volume-profile';
import { sessionBars } from '../../sample.ts';

// A price chart and a rail on one price scale. The chart here is a plain SVG line so the shared numbers are visible:
// the same domain, the same height, and the same top and bottom padding, so a band sits level with its price.
const bars = sessionBars();
const closes = bars.map((b) => (Number(b.high) + Number(b.low)) / 2);
const domain = { min: '496.00', max: '510.00' };
const HEIGHT = 300;
const TOP = 12;
const BOTTOM = 24;
const y = (price: number) => TOP + ((Number(domain.max) - price) / (Number(domain.max) - Number(domain.min))) * (HEIGHT - TOP - BOTTOM);

export default function Example() {
  const w = 600;
  const points = closes.map((c, i) => `${(i / (closes.length - 1)) * w},${y(c)}`).join(' ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 132px', gap: 8, alignItems: 'start' }}>
      <svg viewBox={`0 0 ${w} ${HEIGHT}`} width="100%" height={HEIGHT} preserveAspectRatio="none" role="img" aria-label="Price, 60 five-minute closes, 496 to 510" style={{ display: 'block' }}>
        {[498, 500, 502, 504, 506, 508].map((p) => (
          <line key={p} x1="0" x2={w} y1={y(p)} y2={y(p)} stroke="var(--pu-color-border-default)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ))}
        <polyline points={points} fill="none" stroke="var(--pu-color-text)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <ProfileRail bars={bars} priceDomain={domain} rows={28} height={HEIGHT} paddingTop={TOP} paddingBottom={BOTTOM} label="Volume at price beside the chart" />
    </div>
  );
}
