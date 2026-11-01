import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ChoiceGroup } from '@punji/ui/choice-group';
import { CodeBlock } from '@punji/ui/code-block';
import { downloadText } from '@punji/ui/download';
import { toCsv, type CsvColumn } from '@punji/ui/export';
import { ledgerToCsv, rollUp, trialBalance, type StatementRow } from '@punji/ui/ledger';
import { tdsToCsv } from '@punji/ui/tax';
import { ScreenTitle } from '../shared/kit.tsx';
import { TODAY, dayNumber, decimal, isoDate, shortDate } from '../shared/books.ts';
import { ACCOUNTS, MONTHS, accountName, balanceSheetRows, profitAndLossRows, rangeOf } from './books.ts';
import { PeriodBar } from './PeriodBar.tsx';
import { BOOKS, periodById, useAcct } from './store.ts';

type Kind = 'gl' | 'tb' | 'pl' | 'bs' | 'ar' | 'vat' | 'tds';
const KINDS: { value: Kind; label: string; about: string }[] = [
  { value: 'gl', label: 'General ledger', about: 'Every posting in the period, with account names.' },
  { value: 'tb', label: 'Trial balance', about: 'Debit and credit balances at the end of the period.' },
  { value: 'pl', label: 'Profit and loss', about: 'Income, expenses and net profit for the period.' },
  { value: 'bs', label: 'Balance sheet', about: 'Assets, liabilities and equity at the end of the period.' },
  { value: 'ar', label: 'Receivables', about: 'Open invoices with due dates and days overdue on 15 Kartik 2083.' },
  { value: 'vat', label: 'VAT by month', about: 'Output and input VAT and the amount payable for each BS month (the working for the VAT return).' },
  { value: 'tds', label: 'TDS', about: 'Every withholding in the period with the payee\'s PAN.' },
];
const money = (v: unknown) => decimal(v as bigint);

const flatten = (rows: readonly StatementRow[], keys: readonly string[], depth = 0): { label: string; values: (bigint | null)[] }[] =>
  rows.flatMap((row) =>
    row.kind === 'line'
      ? [{ label: `${'  '.repeat(depth)}${row.label}`, values: keys.map((k) => row.values[k] ?? null) }]
      : [
          { label: `${'  '.repeat(depth)}${row.label}`, values: keys.map(() => null) },
          ...flatten(row.rows, keys, depth + 1),
          ...(row.subtotal ? [{ label: `${'  '.repeat(depth)}${row.subtotal.label}`, values: keys.map((k) => row.subtotal?.values?.[k] ?? null) }] : []),
        ],
  );

/** Exact CSV files of every report, for the auditor, a spreadsheet or the IRD working papers. Amounts are decimal
 *  rupees to the paisa, never floats, and text that could run as a spreadsheet formula is neutralised. */
export default function ExportsScreen() {
  const { state, derived } = useAcct();
  const [kind, setKind] = useState<Kind>('gl');
  const period = periodById(state.periodId);
  const { from, to } = rangeOf(period);
  const lo = dayNumber(from);
  const hi = dayNumber(to);
  const inPeriod = derived.ledger.entries.filter((_, i) => derived.ledger.days[i]! >= lo && derived.ledger.days[i]! <= hi);
  const slug = period.id;

  const build = (): { filename: string; csv: string; rows: number } => {
    switch (kind) {
      case 'gl':
        return { filename: `general-ledger-${slug}.csv`, csv: ledgerToCsv(inPeriod.map((e) => ({ ...e, account: accountName(e.account) })), { currency: 'NPR' }), rows: inPeriod.length };
      case 'tb': {
        const tb = trialBalance(derived.ledger.entries.filter((_, i) => derived.ledger.days[i]! <= hi));
        const order = new Map(ACCOUNTS.map((a, i) => [a.code, i]));
        const rows = tb.accounts.toSorted((a, b) => order.get(a.account)! - order.get(b.account)!);
        const cols: CsvColumn<(typeof rows)[number]>[] = [
          { header: 'Account', accessor: (r) => accountName(r.account) },
          { header: 'Debit', accessor: (r) => (r.net > 0n ? r.net : 0n), format: money, keepNumericText: true },
          { header: 'Credit', accessor: (r) => (r.net < 0n ? -r.net : 0n), format: money, keepNumericText: true },
        ];
        return { filename: `trial-balance-${isoDate(to)}.csv`, csv: toCsv(rows, cols), rows: rows.length };
      }
      case 'pl':
      case 'bs': {
        const rows = rollUp((kind === 'pl' ? profitAndLossRows : balanceSheetRows)(derived.ledger, [{ key: 'cur', from, to }]));
        const flat = flatten(rows, ['cur']);
        const cols: CsvColumn<(typeof flat)[number]>[] = [
          { header: 'Item', accessor: 'label' },
          { header: kind === 'pl' ? `${period.label} (NPR)` : `At ${isoDate(to)} (NPR)`, accessor: (r) => (r.values[0] === null ? '' : decimal(r.values[0]!)), keepNumericText: true },
        ];
        return { filename: `${kind === 'pl' ? 'profit-and-loss' : 'balance-sheet'}-${slug}.csv`, csv: toCsv(flat, cols), rows: flat.length };
      }
      case 'ar': {
        const rows = derived.receivables;
        const cols: CsvColumn<(typeof rows)[number]>[] = [
          { header: 'Invoice', accessor: 'id' },
          { header: 'Customer', accessor: 'party' },
          { header: 'Invoice date', accessor: (r) => isoDate(r.issued) },
          { header: 'Due date', accessor: (r) => isoDate(r.date) },
          { header: 'Days overdue', accessor: (r) => String(Math.max(0, dayNumber(TODAY) - dayNumber(r.date))), keepNumericText: true },
          { header: 'Amount (NPR)', accessor: 'total', format: money, keepNumericText: true },
        ];
        return { filename: `receivables-${isoDate(TODAY)}.csv`, csv: toCsv(rows, cols), rows: rows.length };
      }
      case 'vat': {
        const rows = MONTHS.map((m) => {
          const a = dayNumber(m.start!);
          const b = dayNumber(m.end!);
          let output = 0n;
          let input = 0n;
          derived.ledger.entries.forEach((e, i) => {
            const d = derived.ledger.days[i]!;
            if (d < a || d > b || e.reference?.startsWith('VT-')) return;
            if (e.account === '2100') output += e.credit - e.debit;
            if (e.account === '1150') input += e.debit - e.credit;
          });
          return { month: m.label, output, input };
        });
        const cols: CsvColumn<(typeof rows)[number]>[] = [
          { header: 'Month (BS)', accessor: 'month' },
          { header: 'Output VAT', accessor: 'output', format: money, keepNumericText: true },
          { header: 'Input VAT', accessor: 'input', format: money, keepNumericText: true },
          { header: 'Payable', accessor: (r) => r.output - r.input, format: money, keepNumericText: true },
        ];
        return { filename: 'vat-by-month.csv', csv: toCsv(rows, cols), rows: rows.length };
      }
      case 'tds': {
        const entries = BOOKS.tds.filter((e) => dayNumber(e.date) >= lo && dayNumber(e.date) <= hi);
        return { filename: `tds-${slug}.csv`, csv: tdsToCsv(entries, { rounding: 'half-up' }), rows: entries.length };
      }
    }
  };
  const file = build();
  const about = KINDS.find((k) => k.value === kind)!;
  const preview = file.csv.split(/\r?\n/).slice(0, 9).join('\n');

  return (
    <div className="app-stack">
      <ScreenTitle aside={<PeriodBar testId="ac-export-period" />}>Exports</ScreenTitle>
      <Card title="Choose a report" description={`${period.label}: ${shortDate(from)} to ${shortDate(to)}`} headingLevel={3}>
        <div className="app-stack">
          <ChoiceGroup label="Report" value={kind} onChange={setKind} options={KINDS.map(({ value, label }) => ({ value, label }))} size="sm" appearance="compact" testId="ac-export-kind" />
          <p className="app-muted">{about.about}</p>
          <div className="ac-links">
            <Button onClick={() => downloadText(file.filename, file.csv, 'text/csv;charset=utf-8')} testId="ac-export-download">
              Download {file.filename}
            </Button>
            <span className="app-muted app-small">{file.rows} rows</span>
          </div>
          <CodeBlock aria-label={`First lines of ${file.filename}`} testId="ac-export-preview">{preview}</CodeBlock>
        </div>
      </Card>
    </div>
  );
}
