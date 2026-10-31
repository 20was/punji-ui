import '@punji/ui/styles.css';
import { MoneyDisplay, PriceChange, StockTable, type Quote } from '@punji/ui';

// Prices are bigint minor units (paisa, cents): 51230n is Rs 512.30. The data is invented.
const quotes: Quote[] = [
  { symbol: 'NABIL', ltp: 51230n, previousClose: 50500n, volume: 12400, turnover: 63_525_200n },
  { symbol: 'NTC', ltp: 84000n, previousClose: 85000n, volume: 3100, turnover: 26_040_000n },
];

export function Board() {
  return (
    <>
      <p>
        Portfolio value <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />{' '}
        <PriceChange current={51230n} previous={50500n} currency="NPR" />
      </p>
      <StockTable caption="NEPSE quotes · NPR" quotes={quotes} />
    </>
  );
}
