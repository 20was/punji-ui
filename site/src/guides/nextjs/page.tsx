// app/page.tsx: a server component. MoneyDisplay has no hooks, so it renders on the server with no client JavaScript.
import { MoneyDisplay } from '@punji/ui/money-display';
import { WatchPanel, type QuoteRow } from './watch-panel';

// Replace with your database or API call. Minor units travel as strings: JSON cannot carry a bigint.
async function loadQuotes(): Promise<QuoteRow[]> {
  return [
    { symbol: 'NABIL', ltp: '51230', previousClose: '50500', volume: 12400, turnover: '63525200' },
    { symbol: 'NTC', ltp: '84000', previousClose: '85000', volume: 3100, turnover: '26040000' },
  ];
}

export default async function Page() {
  const rows = await loadQuotes();
  return (
    <main>
      <h1>
        Portfolio <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />
      </h1>
      <WatchPanel rows={rows} />
    </main>
  );
}
