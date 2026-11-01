import { createMoneyFormatter } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';

const usd = createMoneyFormatter({ currency: 'USD', locale: 'en' });
const npr = createMoneyFormatter({ currency: 'NPR', locale: 'en-IN', display: 'code' });
const AMOUNTS = [99999999n, 99999499n, 123456789012n, 123456789012345678901n];

export default function Example() {
  return (
    <DataRows label="Exact amount and its compact form">
      {AMOUNTS.map((minor) => (
        <DataRow key={String(minor)} label={usd.format(minor)} value={`${usd.formatCompact(minor)} · ${npr.formatCompact(minor)}`} />
      ))}
    </DataRows>
  );
}
