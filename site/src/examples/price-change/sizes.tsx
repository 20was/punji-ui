import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';
import { holdings } from '../../sample.ts';

// size="sm" under a price in a list row. The previous close is derived from the sample's percent change.
const preset = nepalMoneyConfig();
const paisa = (rupees: number) => BigInt(Math.round(rupees * 100));

export default function Example() {
  return (
    <div className="ex-narrow">
      <Card title="Watching" meta="4">
        <ul className="ex-rows">
          {holdings.slice(0, 4).map((h) => (
            <li key={h.symbol}>
              <span>
                <b>{h.symbol}</b>
                <small>{h.name}</small>
              </span>
              <span className="ex-end">
                <MoneyDisplay value={paisa(h.ltp)} preset={preset} />
                <PriceChange size="sm" preset={preset} current={paisa(h.ltp)} previous={paisa(h.ltp / (1 + h.change / 100))} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
