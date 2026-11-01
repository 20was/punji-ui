import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { HoldingsTable, type Holding } from './holdings-table';
import { Preferences } from './preferences';

// A Server Component. Money is bigint minor units (paisa): exact sums, no floats. The data is invented; load yours here.
const holdings: Holding[] = [
  { symbol: 'NABIL', name: 'Nabil Bank', units: 120n, close: 51_230n, previous: 50_400n },
  { symbol: 'NTC', name: 'Nepal Telecom', units: 40n, close: 89_850n, previous: 90_900n },
  { symbol: 'HDL', name: 'Himalayan Distillery', units: 15n, close: 152_000n, previous: 152_000n },
  { symbol: 'UPPER', name: 'Upper Tamakoshi Hydropower', units: 200n, close: 24_110n, previous: 23_500n },
];
const npr = nepalMoneyConfig();

export default function Page() {
  const value = holdings.reduce((sum, h) => sum + h.units * h.close, 0n);
  const previous = holdings.reduce((sum, h) => sum + h.units * h.previous, 0n);
  return (
    <div className="dash">
      <header className="dash-bar">
        <h1>Portfolio</h1>
        <Preferences />
      </header>
      <main className="dash-main">
        <div className="dash-kpis">
          <Card title="Market value" description="At today's close">
            <p className="dash-figure">
              <MoneyDisplay value={value} preset={npr} />
            </p>
          </Card>
          <Card title="Today" description="Change since the previous close">
            <p className="dash-figure">
              <PriceChange current={value} previous={previous} preset={npr} />
            </p>
          </Card>
        </div>
        <Card title="Holdings" description="Sorted by market value" flush>
          {/* bigint props cross from a Server Component to a Client Component; JSON (fetch, route handlers) needs strings. */}
          <HoldingsTable holdings={holdings} />
        </Card>
      </main>
    </div>
  );
}
