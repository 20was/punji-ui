import { Card } from '@punji/ui/card';
import { formatBasisPoints, formatChange, formatPrice, formatQuantity } from '@punji/ui/nepal/market-format';
import { DataRow, DataRows } from '@punji/ui/rows';
import { quotes } from '../../sample.ts';

const nabil = quotes.find((q) => q.symbol === 'NABIL')!;
const ltp = Number(nabil.ltp) / 100;
const prev = Number(nabil.previousClose) / 100;

// The market formatters behind a quote line: each returns a string, and a missing value is a dash, never zero.
export default function Example() {
  return (
    <Card title={`${nabil.symbol} quote line`} description="Strings for a notification or a title attribute" headingLevel={3}>
      <DataRows label="Quote formatters">
        <DataRow label="Last traded" value={formatPrice(ltp, { currency: 'NPR' })} />
        <DataRow label="Change in rupees" value={formatChange(ltp - prev)} />
        <DataRow label="Change today" value={formatChange(((ltp - prev) / prev) * 100, { unit: 'percent' })} />
        <DataRow label="Volume" value={formatQuantity(nabil.volume)} />
        <DataRow label="Bid spread" value={formatBasisPoints(-25, { signed: true })} />
        <DataRow label="Not traded today" value={formatPrice(null)} />
      </DataRows>
    </Card>
  );
}
