import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { Field } from '@punji/ui/fields';
import { InlineState } from '@punji/ui/inline-state';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { Select } from '@punji/ui/select';
import { StatusPill } from '@punji/ui/status-pill';
import './screen.css';

// IPO results and your applications. The check is local and deterministic here; in your app it is a request to the
// share registrar's result service. A BOID is 16 digits; the field says what is wrong before anything is sent.
const npr = nepalMoneyConfig();
const UNIT = 10_000n; // Rs 100.00 per unit, in paisa

const ISSUES = [
  { value: 'skhl', label: 'Sanima Khimti Hydro, ordinary shares' },
  { value: 'nrnl', label: 'Nepal Reinsurance Nidhi, ordinary shares' },
  { value: 'mbl', label: 'Mahalaxmi Laghubitta, ordinary shares' },
] as const;
type Issue = (typeof ISSUES)[number]['value'];

interface Application {
  id: string;
  company: string;
  applied: number;
  allotted: number | null;
  closed: string;
}
const APPLICATIONS: Application[] = [
  { id: 'a1', company: 'Sanima Khimti Hydro', applied: 50, allotted: 10, closed: '12 Kartik 2082' },
  { id: 'a2', company: 'Nepal Reinsurance Nidhi', applied: 20, allotted: 0, closed: '28 Ashwin 2082' },
  { id: 'a3', company: 'Mahalaxmi Laghubitta', applied: 10, allotted: null, closed: '19 Kartik 2082' },
  { id: 'a4', company: 'Upper Solu Hydropower', applied: 30, allotted: 10, closed: '2 Bhadra 2082' },
];
const statusOf = (a: Application) =>
  a.allotted === null
    ? { label: 'Result pending', tone: 'warn' as const }
    : a.allotted > 0
      ? { label: 'Allotted', tone: 'gain' as const }
      : { label: 'Not allotted', tone: undefined };
const blocked = (a: Application) => BigInt(a.applied) * UNIT;
const refund = (a: Application) => (a.allotted === null ? 0n : BigInt(a.applied - a.allotted) * UNIT);

// Two columns, so the table fits a phone: the amount blocked sits under the issue, the status under the units.
const columns: FinancialColumn<Application>[] = [
  {
    key: 'company',
    label: 'Issue',
    rowHeader: true,
    render: (a) => (
      <span className="sc-ipo-co">
        <b>{a.company}</b>
        <small>
          <MoneyDisplay value={blocked(a)} preset={npr} /> blocked
        </small>
        <small>Closed {a.closed}</small>
      </span>
    ),
  },
  {
    key: 'units',
    label: 'Allotted',
    num: true,
    render: (a) => {
      const s = statusOf(a);
      return (
        <span className="sc-ipo-units">
          <span>{a.allotted === null ? `${a.applied} applied` : `${a.allotted} of ${a.applied}`}</span>
          <StatusPill size="sm" tone={s.tone}>
            {s.label}
          </StatusPill>
        </span>
      );
    },
  },
];

type Result = { kind: 'allotted' | 'not'; boid: string; issue: string } | null;

export default function Example() {
  const [issue, setIssue] = useState<Issue>('skhl');
  const [boid, setBoid] = useState('1301120000456789');
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const digits = boid.replace(/\s/g, '');
  const error = !touched ? undefined : !/^\d*$/.test(digits) ? 'A BOID has digits only.' : digits.length !== 16 ? `A BOID has 16 digits; this has ${digits.length}.` : undefined;
  const check = () => {
    setTouched(true);
    if (!/^\d{16}$/.test(digits)) return setResult(null);
    const label = ISSUES.find((i) => i.value === issue)!.label.split(',')[0]!;
    setResult({ kind: Number(digits.at(-1)) % 2 === 1 ? 'allotted' : 'not', boid: `${digits.slice(0, 4)} •••• ${digits.slice(-4)}`, issue: label });
  };
  const totalBlocked = APPLICATIONS.reduce((s, a) => s + blocked(a), 0n);
  const totalRefund = APPLICATIONS.reduce((s, a) => s + refund(a), 0n);
  const allottedUnits = APPLICATIONS.reduce((s, a) => s + (a.allotted ?? 0), 0);

  return (
    <div className="sc-ipo">
      <div className="sc-ipo-grid">
        <Card title="Check an IPO result" description="Results from the share registrar, by BOID" headingLevel={3}>
          <form
            className="sc-ipo-form"
            onSubmit={(event) => {
              event.preventDefault();
              check();
            }}
          >
            <Select<Issue> label="Issue" labelPlacement="above" value={issue} onChange={setIssue} options={ISSUES} block />
            <Field
              label="BOID"
              value={boid}
              onChange={(v) => {
                setBoid(v);
                setResult(null);
              }}
              inputMode="numeric"
              autoComplete="off"
              hint="16 digits, from your Demat account"
              error={error}
            />
            <Button type="submit">Check result</Button>
          </form>
          <div aria-live="polite" className="sc-ipo-result">
            {result?.kind === 'allotted' && (
              <InlineState
                icon="check"
                layout="row"
                role="status"
                title={`Allotted: 10 units of ${result.issue}`}
                body={`BOID ${result.boid}. The rest of the blocked amount is released to your bank account.`}
              />
            )}
            {result?.kind === 'not' && (
              <InlineState
                icon="info"
                layout="row"
                role="status"
                title={`Not allotted in ${result.issue}`}
                body={`BOID ${result.boid}. The whole blocked amount is released to your bank account.`}
              />
            )}
          </div>
        </Card>

        <Card title="Open now" description="Ordinary shares, Rs 100 a unit" headingLevel={3}>
          <ul className="sc-ipo-open">
            <li>
              <span>
                <b>Himal Dolakha Hydropower</b>
                <small>10 to 5,000 units · closes 18 Mangsir 2082</small>
              </span>
              <StatusPill size="sm" tone="gain" dot>
                Open
              </StatusPill>
            </li>
            <li>
              <span>
                <b>Nepal Infrastructure Bank</b>
                <small>Opens 25 Mangsir 2082</small>
              </span>
              <StatusPill size="sm" tone="info">
                Upcoming
              </StatusPill>
            </li>
          </ul>
          <div className="sc-ipo-apply">
            <Button variant="secondary" size="sm">
              Apply through your bank
            </Button>
          </div>
        </Card>
      </div>

      <MetricRow label="Your applications" count={3}>
        <MetricTile label="Applied" value={<MoneyDisplay value={totalBlocked} preset={npr} />} note={`${APPLICATIONS.length} issues this year`} />
        <MetricTile label="Allotted" value={`${allottedUnits} units`} note={<MoneyDisplay value={BigInt(allottedUnits) * UNIT} preset={npr} />} />
        <MetricTile label="Released" value={<MoneyDisplay value={totalRefund} preset={npr} />} note="Returned to your bank" />
      </MetricRow>

      <Card title="Applications" description="Applied through ASBA, FY 2082/83" headingLevel={3}>
        <FinancialTable caption="IPO applications, NPR" columns={columns} rows={APPLICATIONS} rowKey={(a) => a.id} emptyTitle="No applications yet" />
      </Card>
    </div>
  );
}
