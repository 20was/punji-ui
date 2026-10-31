import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';

// Quote headers for a rise, a fall and an unchanged price. Direction is in the sign, the arrow and the spoken
// word, so it reads correctly without colour. Prices are paisa (bigint), the change is computed exactly.
const npr = nepalMoneyConfig();
const quotes = [
  { symbol: 'HDL', name: 'Himalayan Distillery', current: 215000n, previous: 210146n },
  { symbol: 'CHCL', name: 'Chilime Hydropower', current: 61230n, previous: 62890n },
  { symbol: 'SBL', name: 'Siddhartha Bank', current: 33120n, previous: 33120n },
];

export default function Example() {
  return (
    <div className="ex-cols">
      {quotes.map((q) => (
        <div key={q.symbol} className="ex-panel">
          <div className="ex-panel-head">
            <p className="ex-panel-title">
              <b>{q.symbol}</b> · {q.name}
            </p>
          </div>
          <p className="ex-big">
            <MoneyDisplay value={q.current} preset={npr} />
          </p>
          <PriceChange current={q.current} previous={q.previous} preset={npr} />
        </div>
      ))}
    </div>
  );
}
