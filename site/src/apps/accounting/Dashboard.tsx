import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ColumnChart } from '@punji/ui/column-chart';
import { trialBalance } from '@punji/ui/ledger';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { compareDates, npr, rs, shortDate } from '../shared/books.ts';
import { MONTHS, netByAccount, onNormal, profitOf } from './books.ts';
import { BOOKS, isOverdue, useAcct, type Screen } from './store.ts';

const sum = (items: readonly { total: bigint }[]) => items.reduce((s, i) => s + i.total, 0n);
const lakh = (paisa: bigint) => Number(paisa / 100n) / 100_000;

/** Cash, receivables, payables and profit; income and expenses by month; what is due to the government; and checks
 *  that the books agree with themselves. */
export function Dashboard() {
  const { state, derived, go } = useAcct();
  const { now, ytd, receivables, payables, ledger } = derived;
  const cash = onNormal(now, '1000') + onNormal(now, '1010');
  const ar = onNormal(now, '1100');
  const ap = onNormal(now, '2000');
  const overdue = sum(receivables.filter(isOverdue));
  const lastYear = profitOf(netByAccount(ledger, MONTHS[0]!.start!, { year: 2025, month: 11, day: 1 }));
  const ashwin = MONTHS[14]!;
  const atAshwin = netByAccount(ledger, null, ashwin.end!);
  const vat = onNormal(atAshwin, '2100') - onNormal(atAshwin, '1150');
  const tds = onNormal(atAshwin, '2200');
  const ssf = onNormal(atAshwin, '2300') + onNormal(atAshwin, '2310');
  const tb = trialBalance(state.journals);
  const assets = ['1000', '1010', '1100', '1150', '1160', '1500'].reduce((s, c) => s + onNormal(now, c), 0n) - onNormal(now, '1510');
  const liabilities = ['2000', '2100', '2200', '2300', '2310'].reduce((s, c) => s + onNormal(now, c), 0n);
  const equity = onNormal(now, '3000') + onNormal(now, '3100') + profitOf(now).profit;
  const matched = state.matches.reduce((n, m) => n + m.ledgerIds.length, 0);
  const checks: { label: string; ok: boolean; detail: string; screen: Screen }[] = [
    { label: 'Trial balance', ok: tb.balanced, detail: tb.balanced ? `Debits equal credits: ${rs(tb.totals.debit)}` : `Out by ${rs(tb.difference)}`, screen: 'trial' },
    { label: 'Balance sheet', ok: assets === liabilities + equity, detail: `Assets ${rs(assets)} = liabilities and equity ${rs(liabilities + equity)}`, screen: 'statements' },
    { label: 'Receivables', ok: ar === sum(receivables), detail: `Ledger ${rs(ar)}, open invoices ${rs(sum(receivables))}`, screen: 'aging' },
    { label: 'Payables', ok: ap === sum(payables), detail: `Ledger ${rs(ap)}, open bills ${rs(sum(payables))}`, screen: 'aging' },
    { label: 'Bank, Ashwin', ok: matched === derived.bankItems.length, detail: `${matched} of ${derived.bankItems.length} ledger lines matched to the statement`, screen: 'bank' },
  ];
  const columns = MONTHS.map((m) => {
    const p = profitOf(netByAccount(ledger, m.start!, m.end!));
    return { key: m.id, label: m.label, short: m.label.slice(0, 3), values: [lakh(p.income), -lakh(p.expenses)] };
  });
  const recent = state.journals.toSorted((a, b) => compareDates(a.date, b.date)).slice(-5).toReversed();

  return (
    <div className="app-stack">
      <ScreenTitle>Dashboard</ScreenTitle>
      <MetricRow label="Key figures on 15 Kartik 2083" count={4} testId="ac-kpis">
        <MetricTile label="Cash and bank" value={<MoneyDisplay value={cash} preset={npr} testId="ac-kpi-cash" />} note="Cash in hand and NIC Asia Bank" />
        <MetricTile label="Receivables" value={<MoneyDisplay value={ar} preset={npr} testId="ac-kpi-ar" />} note={`${rs(overdue)} overdue`} />
        <MetricTile label="Payables" value={<MoneyDisplay value={ap} preset={npr} testId="ac-kpi-ap" />} note={`${payables.length} open ${payables.length === 1 ? 'bill' : 'bills'}`} />
        <MetricTile tone="inverse" label="Net profit, FY 2083/84 to date" value={<MoneyDisplay value={ytd.profit} preset={npr} testId="ac-kpi-profit" />} note={`Same days last year ${rs(lastYear.profit)}`} />
      </MetricRow>
      <div className="app-grid is-split">
        <Card title="Income and expenses by month" description="Rs lakh, Shrawan 2082 to Kartik 2083 (to date)" headingLevel={3}>
          <ColumnChart
            label="Income and expenses by BS month, Rs lakh"
            series={[
              { key: 'income', label: 'Income', tone: 'gain' },
              { key: 'expenses', label: 'Expenses (below the line)', tone: 'loss' },
            ]}
            columns={columns}
            format={(v) => `Rs ${Math.abs(v).toFixed(2)} lakh`}
            height={200}
          />
        </Card>
        <Card title="Due by 25 Kartik (11 Nov 2026)" description="For Ashwin 2083, to the IRD and the SSF" headingLevel={3} testId="ac-dues">
          <dl className="ac-facts">
            <div><dt>VAT (output less input)</dt><dd><MoneyDisplay value={vat} preset={npr} /></dd></div>
            <div><dt>TDS withheld</dt><dd><MoneyDisplay value={tds} preset={npr} /></dd></div>
            <div><dt>SSF and CIT</dt><dd><MoneyDisplay value={ssf} preset={npr} /></dd></div>
            <div className="is-total"><dt>Total to deposit</dt><dd><MoneyDisplay value={vat + tds + ssf} preset={npr} testId="ac-dues-total" /></dd></div>
          </dl>
          <div className="ac-links">
            <Button size="sm" variant="secondary" onClick={() => go('tds')}>TDS summary</Button>
            <Button size="sm" variant="secondary" onClick={() => go('aging')}>Overdue invoices</Button>
          </div>
        </Card>
      </div>
      <div className="app-grid is-halves">
        <Card title="Books check" description="Every screen reads the same journals" headingLevel={3} testId="ac-checks">
          <ul className="ac-checks">
            {checks.map((c) => (
              <li key={c.label}>
                <StatusPill tone={c.ok ? 'gain' : 'warn'} size="sm">{c.ok ? 'Agrees' : 'Check'}</StatusPill>
                <span>
                  <strong>{c.label}</strong>
                  <span className="app-muted app-small"> {c.detail}</span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => go(c.screen)} aria-label={`Open ${c.label}`}>Open</Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Latest journals" description={`${state.journals.length} journals since Shrawan 2082`} headingLevel={3}>
          <ul className="ac-recent">
            {recent.map((j) => (
              <li key={j.id}>
                <span>
                  <strong>{j.memo}</strong>
                  <span className="app-muted app-small"> {j.id} · {shortDate(j.date)}</span>
                </span>
                <MoneyDisplay value={j.lines.reduce((s, l) => s + l.debit, 0n)} preset={npr} />
              </li>
            ))}
          </ul>
          <div className="ac-links">
            <Button size="sm" onClick={() => go('journal')}>New journal</Button>
            <Button size="sm" variant="secondary" onClick={() => go('ledger')}>Open the ledger</Button>
          </div>
        </Card>
      </div>
      <p className="app-small app-muted">
        {BOOKS.invoices.length} invoices and {BOOKS.bills.length} bills since Shrawan 2082. Revenue this year {rs(ytd.income)}, expenses {rs(ytd.expenses)}.
      </p>
    </div>
  );
}
