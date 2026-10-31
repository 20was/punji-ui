import { TransactionHistory } from '@punji/ui/transaction-history';
import { formatBSDate, gregorianToBS } from '@punji/ui/nepal';
import { parseCalendarDate } from '@punji/ui/nepal/date-only';
import { portfolioTransactions } from '../../sample.ts';

// Dates are stored as Gregorian ISO strings; formatDate decides how they print. Here: Bikram Sambat.
const bs = (iso: string) => formatBSDate(gregorianToBS(parseCalendarDate(iso)!));

export default function Example() {
  return <TransactionHistory transactions={portfolioTransactions} caption="Transactions, BS dates" formatDate={bs} pageSize={6} labels={{ types: { buy: 'Kharid', sell: 'Bikri' } }} />;
}
