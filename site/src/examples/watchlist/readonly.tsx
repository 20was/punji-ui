import { Watchlist } from '@punji/ui/watchlist';
import { quotesWithGaps } from '../../sample.ts';

// No callbacks: no move or remove buttons. Missing prices are dashes; no history means no trend line.
export default function Example() {
  return <Watchlist quotes={quotesWithGaps} label="Shared watchlist" showTrend />;
}
