'use client';

import { LiveFigure } from '@punji/ui/live-figure';
import { createSocketFeed, useLastTick } from './quote-feed';

// Create the adapter once, outside any component, so every render sees the same feed.
const feed = createSocketFeed('wss://quotes.example.invalid/stream');

/** The component takes data, not a URL: it subscribes through the hook and prints through LiveFigure. */
export function LivePrice({ symbol }: { symbol: string }) {
  const tick = useLastTick(feed, symbol);
  // Display-only conversion from minor units. Keep arithmetic that matters in bigint.
  const price = tick ? Number(tick.ltp) / 100 : null;
  return (
    <p>
      {symbol} <LiveFigure value={price} kind="rs" id={symbol} />
    </p>
  );
}
