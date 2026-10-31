import { MarketHeatmap, squarify, heatStep, type HeatmapItem } from '@punji/ui/market-heatmap';

// Unsized items are not drawn (listed under the map and in the table); a missing change is a neutral tile.
const items: HeatmapItem[] = [
  { id: 'NABIL', label: 'NABIL', name: 'Nabil Bank', size: 5_200, change: 1.25 },
  { id: 'NTC', label: 'NTC', name: 'Nepal Telecom', size: 3_100, change: -0.47 },
  { id: 'HDL', label: 'HDL', name: 'Himalayan Distillery', size: 1_800, change: 4.2 },
  { id: 'CHCL', label: 'CHCL', name: 'Chilime Hydropower', size: 900, change: -3.6 },
  { id: 'SBL', label: 'SBL', name: 'Siddhartha Bank', size: 600, change: null },
  { id: 'BFC', label: 'BFC', name: 'Butwal Finance', size: null, change: 0 },
  { id: 'ZERO', label: 'ZERO', name: 'Zero turnover', size: 0, change: 0.8 },
];

const layout = squarify(items, { width: 100, height: 100 });

export default function Example() {
  return (
    <div className="ex-stack">
      <MarketHeatmap items={items} label="Heatmap with gaps" sizeLabel="Turnover" aspect={1} scaleMax={4} convention="red-up" />
      <p>
        {layout.rects.length} drawn, skipped: {layout.skipped.join(', ')}. Step for +4.2%: {heatStep(4.2, 4)}.
      </p>
    </div>
  );
}
