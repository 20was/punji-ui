import { Breakdown, BreakdownRow } from '@punji/ui/breakdown';
import { Button } from '@punji/ui/button';
import { applyRate } from '@punji/ui/calculations';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { KeyStats } from '@punji/ui/key-stats';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { formatBSDate, gregorianToBS } from '@punji/ui/nepal/calendar';
import { PaymentStatus } from '@punji/ui/payment-status';
import { DataRow, DataRows } from '@punji/ui/rows';
import './screen.css';

// A VAT invoice. Every amount is bigint paisa: line totals are quantity × rate, VAT is applyRate at 13% with
// half-up rounding, and the balance is the total less the payments recorded. The layout prints on one A4 page.
const npr = nepalMoneyConfig();
const money = (minor: bigint) => <MoneyDisplay value={minor} preset={npr} display="none" />;

interface Line {
  id: string;
  item: string;
  detail: string;
  quantity: bigint;
  /** Paisa per unit. */
  rate: bigint;
}
const LINES: Line[] = [
  { id: 'l1', item: 'A4 copier paper, 80 gsm', detail: 'Box of 5 reams', quantity: 40n, rate: 285_000n },
  { id: 'l2', item: 'Ledger books, 200 pages', detail: 'Hard bound, ruled', quantity: 25n, rate: 64_000n },
  { id: 'l3', item: 'Toner cartridge, 85A', detail: 'Compatible', quantity: 6n, rate: 345_000n },
  { id: 'l4', item: 'Delivery within the valley', detail: 'Kathmandu, Lalitpur, Bhaktapur', quantity: 1n, rate: 50_000n },
];
const lineTotal = (l: Line) => l.quantity * l.rate;
const subtotal = LINES.reduce((sum, l) => sum + lineTotal(l), 0n);
const discount = applyRate(subtotal, '0.05', 'half-up');
const taxable = subtotal - discount;
const vat = applyRate(taxable, '0.13', 'half-up');
const total = taxable + vat;
const PAYMENTS = [{ id: 'p1', label: 'Bank transfer, NIC Asia', date: { year: 2025, month: 11, day: 5 }, amount: 10_000_000n }];
const paid = PAYMENTS.reduce((sum, p) => sum + p.amount, 0n);
const balance = total - paid;
const paidPct = Number((paid * 100n) / total);

const issued = { year: 2025, month: 10, day: 29 };
const due = { year: 2025, month: 11, day: 28 };
const bs = (d: { year: number; month: number; day: number }) => formatBSDate(gregorianToBS(d));
const ad = (d: { year: number; month: number; day: number }) =>
  new Date(Date.UTC(d.year, d.month - 1, d.day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const columns: FinancialColumn<Line>[] = [
  // Quantity and rate sit under the item, so the table keeps two columns and fits a phone.
  {
    key: 'item',
    label: 'Item',
    rowHeader: true,
    render: (l) => (
      <span className="sc-inv-item">
        <b>{l.item}</b>
        <small>
          {l.quantity.toLocaleString('en-IN')} × {money(l.rate)} · {l.detail}
        </small>
      </span>
    ),
  },
  { key: 'amount', label: 'Amount', num: true, render: (l) => money(lineTotal(l)) },
];

export default function Example() {
  return (
    <div className="sc-inv">
      <div className="sc-inv-bar">
        <div className="sc-inv-title">
          <h3>Invoice INV-2082-0147</h3>
          <PaymentStatus status="partial" />
        </div>
        <div className="sc-inv-actions">
          <Button variant="secondary" size="sm">
            Download PDF
          </Button>
          <Button variant="secondary" size="sm">
            Send reminder
          </Button>
          <Button size="sm">Record payment</Button>
        </div>
      </div>

      <div className="sc-inv-grid">
        <article className="sc-inv-paper" aria-label="Invoice INV-2082-0147">
          <header className="sc-inv-head">
            <div>
              <p className="sc-inv-from">Himalayan Stationers Pvt. Ltd.</p>
              <p className="sc-inv-muted">New Road, Kathmandu · PAN 301234567</p>
            </div>
            <p className="sc-inv-kind">Tax invoice</p>
          </header>
          <KeyStats
            cols={3}
            label="Invoice details"
            empty="Not set"
            items={[
              { label: 'Billed to', value: 'Sagarmatha Traders', sub: 'Butwal · PAN 609876543' },
              { label: 'Issued', value: bs(issued), sub: ad(issued) },
              { label: 'Due', value: bs(due), sub: `${ad(due)} · 30 days` },
            ]}
          />
          <FinancialTable caption="Invoice lines, NPR" columns={columns} rows={LINES} rowKey={(l) => l.id} emptyTitle="No lines on this invoice" />
          <div className="sc-inv-totals">
            <Breakdown>
              <BreakdownRow label="Subtotal" value={money(subtotal)} />
              <BreakdownRow label="Trade discount" note="5% of the subtotal" value={<>- {money(discount)}</>} tone="down" />
              <BreakdownRow label="Taxable amount" value={money(taxable)} />
              <BreakdownRow label="VAT" note="13% of the taxable amount" value={money(vat)} />
              <BreakdownRow label="Total" total value={<MoneyDisplay value={total} preset={npr} />} />
            </Breakdown>
          </div>
          <p className="sc-inv-muted sc-inv-foot">Pay to Himalayan Stationers Pvt. Ltd., NIC Asia Bank, current account. Quote INV-2082-0147 as the reference.</p>
        </article>

        <aside className="sc-inv-side" aria-label="Payment">
          <Card title="Balance due" description={`Due ${bs(due)}`} headingLevel={3}>
            <div className="sc-inv-stack">
              <p className="sc-inv-balance">
                <MoneyDisplay value={balance} preset={npr} />
              </p>
              <MeterBar parts={[{ value: paidPct, tone: 'gain' }]} max={100} label={`${paidPct}% paid`} />
              <DataRows label="Payment summary">
                <DataRow label="Invoice total" value={money(total)} />
                {PAYMENTS.map((p) => (
                  <DataRow key={p.id} label={p.label} note={bs(p.date)} value={<>- {money(p.amount)}</>} />
                ))}
                <DataRow label="Balance" total value={money(balance)} />
              </DataRows>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
