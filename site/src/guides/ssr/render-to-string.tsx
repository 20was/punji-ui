// server.tsx: render a component to HTML in Node, with no DOM and no browser globals.
import { renderToString } from 'react-dom/server';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { StockTable, type Quote } from '@punji/ui/stock-table';

const quotes: Quote[] = [{ symbol: 'NABIL', ltp: 51230n, previousClose: 50500n, volume: 12400, turnover: 63_525_200n }];

export function renderBoard(): string {
  return renderToString(
    <>
      <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />
      <PriceChange current={51230n} previous={50500n} currency="NPR" locale="en-IN" />
      <StockTable caption="Quotes" quotes={quotes} />
    </>,
  );
}
