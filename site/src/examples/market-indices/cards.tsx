import { MarketIndices } from '@punji/ui/market-indices';
import { marketIndices } from '../../sample.ts';

// The last index has no published value today: a dash, never zero.
export default function Example() {
  return (
    <MarketIndices
      indices={marketIndices}
      label="Market indices"
      state="open"
      asOf="As of 14:58, 14 Nov"
    />
  );
}
