import { toCsv, CSV_MIME } from '@punji/ui/export';
import { downloadText } from '@punji/ui/download';

interface Payment {
  payee: string; // user-typed text: may start with = + - @
  account: string; // sensitive
  amount: number;
}

/** Show only the last four characters. Do this before the value reaches a column, never after. */
const mask = (account: string) => `****${account.slice(-4)}`;

export function exportPayments(payments: readonly Payment[]): void {
  const csv = toCsv(
    payments,
    [
      // Text cells starting with = + - @ get a leading apostrophe by default (formula injection).
      { header: 'Payee', accessor: 'payee' },
      { header: 'Account', accessor: 'account', format: (value) => mask(String(value)) },
      { header: 'Amount', accessor: 'amount' },
    ],
    { bom: true },
  );
  // Runs in the browser only; the file never leaves it. The server still validates and authorises every export.
  downloadText('payments.csv', csv, CSV_MIME);
}
