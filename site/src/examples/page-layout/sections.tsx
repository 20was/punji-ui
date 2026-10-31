import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ListSectionHeader } from '@punji/ui/layout';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { quotes } from '../../sample.ts';

const npr = nepalMoneyConfig();
const pick = (symbols: string[]) => quotes.filter((q) => symbols.includes(q.symbol));

// A section title with one action or a quiet detail. level 3 sits under an h2; size="sm" and caption are for inside a card.
export default function Example() {
  return (
    <div className="ex-medium ex-sections">
      <section>
        <ListSectionHeader title="Holdings" action={<Button variant="ghost" size="sm">See all</Button>} />
        <ul className="ex-rows">
          {pick(['NABIL', 'UPPER', 'NICA']).map((q) => (
            <li key={q.symbol}>
              <span>
                <b>{q.symbol}</b>
                <small>{q.name}</small>
              </span>
              <MoneyDisplay value={q.ltp} preset={npr} />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <ListSectionHeader title="Watchlist" detail="12 stocks" />
        <ul className="ex-rows">
          {pick(['HDL', 'CHCL']).map((q) => (
            <li key={q.symbol}>
              <span>
                <b>{q.symbol}</b>
                <small>{q.name}</small>
              </span>
              <PriceChange size="sm" current={q.ltp} previous={q.previousClose} preset={npr} />
            </li>
          ))}
        </ul>
      </section>
      <Card title="Dividends" headingLevel={2}>
        <ListSectionHeader level={3} size="sm" title="Paid this year" detail="Rs 3,120" />
        <ListSectionHeader level={3} caption title="Upcoming" />
        <ListSectionHeader level={3} size="sm" title="NABIL book closure" detail="2 Mangsir" />
      </Card>
    </div>
  );
}
