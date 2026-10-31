import { ShareDonut, ShareLegend, SHARE_TONES, type ShareItem } from '@punji/ui/meter';
import { sectorShares } from '../../sample.ts';

const items: ShareItem[] = sectorShares.map((s, i) => ({ key: s.key, label: s.label, pct: s.pct, tone: SHARE_TONES[i] ?? 'rest' }));

// The ring and the legend are separate so you can place them: ring on the left, rows on the right.
export default function Example() {
  return (
    <div className="ex-row">
      <ShareDonut items={items} count={12} unit="holdings" label="Holdings by sector: Banking 46 percent, Hydropower 22, Manufacturing 14, Insurance 10, Telecom 8" />
      <ShareLegend items={items} layout="rows" label="Sectors" />
    </div>
  );
}
