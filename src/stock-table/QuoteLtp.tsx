import { Live } from '../live-figure/LiveFigure.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import type { Quote } from './quotes.ts';

/** The last traded price of a quote. With `live` it counts to each new value and flashes its direction. */
export function QuoteLtp({ quote, money, live }: { quote: Pick<Quote, 'symbol' | 'ltp'>; money: MoneyFormatConfig; live?: boolean }) {
  if (!live || quote.ltp === null) return <MoneyDisplay value={quote.ltp} preset={money} />;
  const formatter = getMoneyFormatter(money);
  const scale = 10 ** formatter.exponent;
  return (
    <Live value={Number(quote.ltp) / scale} id={quote.symbol} dp={formatter.exponent}>
      {(n) => (n === null || n === undefined ? '—' : formatter.format(BigInt(Math.round(n * scale))))}
    </Live>
  );
}
