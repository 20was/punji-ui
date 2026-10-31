import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';
import { holdings } from '../../sample.ts';

const preset = nepalMoneyConfig();
const paisa = (rupees: number) => BigInt(Math.round(rupees * 100));

export default function Example() {
  return (
    <ul className="ex-stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {holdings.slice(0, 4).map((h) => (
        <li key={h.symbol} className="ex-row" style={{ justifyContent: 'space-between' }}>
          <strong>{h.symbol}</strong>
          <span style={{ textAlign: 'right' }}>
            <MoneyDisplay value={paisa(h.ltp)} preset={preset} />
            <br />
            <PriceChange size="sm" preset={preset} current={paisa(h.ltp)} previous={paisa(h.ltp / (1 + h.change / 100))} />
          </span>
        </li>
      ))}
    </ul>
  );
}
