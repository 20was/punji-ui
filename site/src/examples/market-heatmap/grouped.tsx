import { useState } from 'react';
import { MarketHeatmap, type HeatmapItem } from '@punji/ui/market-heatmap';

// Sector, industry, stock. Size is market cap in NPR crore; colour and the printed number are the day's change.
// Each stock is a link (here a fragment; in an app, an in-app path through LinkProvider). The tiny ones fold into "+N more".
const s = (id: string, name: string, group: string[], size: number, change: number | null): HeatmapItem => ({ id, label: id, name, group, size, change, href: `#${id}` });

const items: HeatmapItem[] = [
  s('NABIL', 'Nabil Bank', ['Banking', 'Commercial banks'], 5200, 1.25),
  s('NICA', 'NIC Asia Bank', ['Banking', 'Commercial banks'], 3900, -0.62),
  s('SCBL', 'Standard Chartered', ['Banking', 'Commercial banks'], 3100, 0.31),
  s('SBL', 'Siddhartha Bank', ['Banking', 'Commercial banks'], 2600, 2.4),
  s('GBIME', 'Global IME Bank', ['Banking', 'Commercial banks'], 2300, -1.9),
  s('MBL', 'Machhapuchchhre Bank', ['Banking', 'Commercial banks'], 900, 0.1),
  s('SHINE', 'Shine Resunga', ['Banking', 'Development banks'], 700, -0.4),
  s('GBBL', 'Garima Bikas', ['Banking', 'Development banks'], 520, 3.8),
  s('KSBBL', 'Kamana Sewa', ['Banking', 'Development banks'], 12, 0.9),
  s('JBBL', 'Jyoti Bikas', ['Banking', 'Development banks'], 10, -0.2),
  s('MLBL', 'Mahila Laghubitta', ['Banking', 'Development banks'], 9, 1.1),
  s('NHPC', 'National Hydro', ['Hydropower', 'Generation'], 2400, -2.7),
  s('UPPER', 'Upper Tamakoshi', ['Hydropower', 'Generation'], 4400, 3.4),
  s('CHCL', 'Chilime', ['Hydropower', 'Generation'], 1700, -0.8),
  s('BPCL', 'Butwal Power', ['Hydropower', 'Generation'], 1300, 0.6),
  s('RHPL', 'Rasuwagadhi', ['Hydropower', 'Generation'], 1100, 1.8),
  s('NLIC', 'Nepal Life', ['Insurance', 'Life insurance'], 2000, -0.1),
  s('LICN', 'Life Insurance Nepal', ['Insurance', 'Life insurance'], 1500, 0.5),
  s('NICL', 'Nepal Insurance', ['Insurance', 'Non-life insurance'], 800, -1.2),
  s('NTC', 'Nepal Telecom', ['Telecom'], 3300, 0.2),
  s('HDL', 'Himalayan Distillery', ['Manufacturing', 'Beverages'], 1900, 4.9),
];

export default function Example() {
  const [path, setPath] = useState<string[]>([]);
  return (
    <>
      <MarketHeatmap items={items} label="NSE sectors by market cap" sizeLabel="Market cap (crore)" path={path} onPathChange={setPath} />
      <p>Level: {path.length ? path.join(' > ') : 'all sectors'}.</p>
    </>
  );
}
