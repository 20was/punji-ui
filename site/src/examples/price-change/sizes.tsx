import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';
import { holdings } from '../../sample.ts';
import { RowList, ValueRow } from '@punji/ui/rows';

// size="sm" under a price in a list row. The previous close is derived from the sample's percent change.
const preset = nepalMoneyConfig();
const paisa = (rupees: number) => BigInt(Math.round(rupees * 100));

export default function Example() {
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Card title="Watching" meta="4">
        <RowList>
          {holdings.slice(0, 4).map((h) => (
            <ValueRow key={h.symbol} title={h.symbol} line={h.name} figure={<span style={{ display: 'grid', justifyItems: 'end', gap: 2 }}>
                <MoneyDisplay value={paisa(h.ltp)} preset={preset} />
                <PriceChange size="sm" preset={preset} current={paisa(h.ltp)} previous={paisa(h.ltp / (1 + h.change / 100))} />
              </span>} />
          ))}
        </RowList>
      </Card>
    </div>
  );
}
