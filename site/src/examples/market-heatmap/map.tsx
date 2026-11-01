import { useState } from 'react';
import { MarketHeatmap, heatmapItemsFromQuotes } from '@punji/ui/market-heatmap';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { quotes } from '../../sample.ts';
import { Cluster, Stack } from '@punji/ui/stack';

const npr = nepalMoneyConfig();
const items = heatmapItemsFromQuotes(quotes, 'turnover');

// Tiles are buttons when onSelect is given; here the pick fills the quote line under the map.
export default function Example() {
  const [picked, setPicked] = useState(quotes[0]!.symbol);
  const quote = quotes.find((q) => q.symbol === picked) ?? quotes[0]!;
  return (
    <Stack>
      <MarketHeatmap items={items} label="NEPSE turnover heatmap" sizeLabel="Turnover" onSelect={setPicked} />
      <Cluster align="baseline" gap={2} aria-live="polite" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <b>{quote.symbol}</b>
        <span style={{ fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>{quote.name}</span>
        <MoneyDisplay value={quote.ltp} preset={npr} />
        <PriceChange size="sm" current={quote.ltp} previous={quote.previousClose} preset={npr} />
      </Cluster>
    </Stack>
  );
}
