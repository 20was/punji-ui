import { StockTable } from '@punji/ui/stock-table';
import { quotesWithGaps } from '../../sample.ts';

// BFC did not trade (no price, volume or turnover); IPOX has no previous close, so no change.
// Missing values are a dash with a spoken "No value", never zero, and they sort last.
export default function Example() {
  return (
    <StockTable
      caption="Quotes with gaps"
      quotes={quotesWithGaps}
      columns={['symbol', 'ltp', 'change', 'volume']}
      sort={{ key: 'ltp', dir: 'desc' }}
      onSortChange={() => {}}
      density="compact"
    />
  );
}
