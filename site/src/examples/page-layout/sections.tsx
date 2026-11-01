import { Stack } from '@punji/ui/stack';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ListSectionHeader } from '@punji/ui/layout';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { quotes } from '../../sample.ts';
import { RowList, ValueRow } from '@punji/ui/rows';

const npr = nepalMoneyConfig();
const pick = (symbols: string[]) => quotes.filter((q) => symbols.includes(q.symbol));

// A section title with one action or a quiet detail. level 3 sits under an h2; size="sm" and caption are for inside a card.
export default function Example() {
  return (
    <Stack gap={4} style={{ width: 'min(100%, 720px)', marginInline: 'auto' }}>
      <Stack as="section" gap={2}>
        <ListSectionHeader title="Holdings" action={<Button variant="ghost" size="sm">See all</Button>} />
        <RowList>
          {pick(['NABIL', 'UPPER', 'NICA']).map((q) => (
            <ValueRow key={q.symbol} title={q.symbol} line={q.name} figure={<MoneyDisplay value={q.ltp} preset={npr} />} />
          ))}
        </RowList>
      </Stack>
      <Stack as="section" gap={2}>
        <ListSectionHeader title="Watchlist" detail="12 stocks" />
        <RowList>
          {pick(['HDL', 'CHCL']).map((q) => (
            <ValueRow key={q.symbol} title={q.symbol} line={q.name} figure={<PriceChange size="sm" current={q.ltp} previous={q.previousClose} preset={npr} />} />
          ))}
        </RowList>
      </Stack>
      <Card title="Dividends" headingLevel={2}>
        <ListSectionHeader level={3} size="sm" title="Paid this year" detail="Rs 3,120" />
        <ListSectionHeader level={3} caption title="Upcoming" />
        <ListSectionHeader level={3} size="sm" title="NABIL book closure" detail="2 Mangsir" />
      </Card>
    </Stack>
  );
}
