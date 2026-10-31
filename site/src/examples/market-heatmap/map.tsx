import { useState } from 'react';
import { MarketHeatmap, heatmapItemsFromQuotes } from '@punji/ui/market-heatmap';
import { quotes } from '../../sample.ts';

const items = heatmapItemsFromQuotes(quotes, 'turnover');

export default function Example() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="ex-stack">
      <MarketHeatmap
        items={items}
        label="NEPSE turnover heatmap"
        sizeLabel="Turnover"
        onSelect={setPicked}
      />
      <p>{picked ? `Selected: ${picked}` : 'Select a tile to open a stock.'}</p>
    </div>
  );
}
