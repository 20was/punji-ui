import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialSummary, FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Payslip } from '@punji/ui/payslip';
import { Select } from '@punji/ui/select';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { COMPANY, PAYROLL, PAYROLL_TOTALS, npr, rs, type PayrollRow } from '../shared/books.ts';
import { useBiz } from './store.ts';

const STAGES = { review: 'Draft, to review', approved: 'Approved', paid: 'Paid' } as const;

/** The Kartik 2083 payroll: pay, SSF, CIT and TDS per person with totals; review, approve and pay; then payslips. */
export default function PayrollScreen() {
  const { state, dispatch, go } = useBiz();
  const [employeeId, setEmployeeId] = useState(PAYROLL[0]!.employee.id);
  const t = PAYROLL_TOTALS;
  const slip = PAYROLL.find((r) => r.employee.id === employeeId)!;
  const columns: FinancialColumn<PayrollRow>[] = [
    { key: 'name', label: 'Employee', rowHeader: true, render: (r) => <span className="bz-cell"><strong>{r.employee.name}</strong><span className="app-muted app-small">{r.employee.code} · {r.employee.designation}</span></span> },
    { key: 'net', label: 'Net pay', num: true, render: (r) => <MoneyDisplay value={r.net} preset={npr} testId={`bz-net-${r.employee.code}`} /> },
    { key: 'gross', label: 'Gross', num: true, render: (r) => <MoneyDisplay value={r.gross} preset={npr} /> },
    { key: 'ssf', label: 'SSF 31%', num: true, render: (r) => <MoneyDisplay value={r.ssf} preset={npr} />, wide: true },
    { key: 'cit', label: 'CIT', num: true, render: (r) => <MoneyDisplay value={r.cit} preset={npr} />, hideUnder: 1024 },
    { key: 'tds', label: 'TDS', num: true, render: (r) => <MoneyDisplay value={r.tds} preset={npr} />, wide: true },
  ];
  return (
    <div className="app-stack">
      <ScreenTitle aside={<StatusPill tone={state.payroll === 'paid' ? 'gain' : state.payroll === 'approved' ? 'info' : 'accent'} size="sm">{STAGES[state.payroll]}</StatusPill>}>Payroll, Kartik 2083</ScreenTitle>
      <div className="app-summary">
        <FinancialSummary
          label="Payroll totals, Kartik 2083"
          metrics={[
            { id: 'gross', label: 'Gross pay', value: <MoneyDisplay value={t.gross} preset={npr} testId="bz-payroll-gross" />, note: `Salary ${rs(t.salary)} and employer SSF ${rs(t.employerSsf)}` },
            { id: 'deductions', label: 'Deductions', value: <MoneyDisplay value={t.ssf + t.cit + t.tds} preset={npr} />, note: `SSF ${rs(t.ssf)}, CIT ${rs(t.cit)}, TDS ${rs(t.tds)}` },
            { id: 'net', label: 'Net pay to banks', value: <MoneyDisplay value={t.net} preset={npr} testId="bz-payroll-net" />, note: `${PAYROLL.length} accounts` },
            { id: 'cost', label: 'Cost to the company', value: <MoneyDisplay value={t.gross} preset={npr} />, note: 'Posted to salaries and employer SSF' },
          ]}
        />
      </div>
      <Card
        title="Pay run"
        description="SSF 11% from the employee and 20% from the company; TDS is one twelfth of each person's tax for the year."
        headingLevel={3}
        action={
          <div className="bz-actions">
            {state.payroll === 'review' && <Button size="sm" onClick={() => dispatch({ type: 'payroll', stage: 'approved' })} testId="bz-payroll-approve">Approve</Button>}
            {state.payroll === 'approved' && (
              <>
                <Button size="sm" onClick={() => dispatch({ type: 'payroll', stage: 'paid' })} testId="bz-payroll-pay">Pay {rs(t.net)}</Button>
                <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'payroll', stage: 'review' })}>Reopen</Button>
              </>
            )}
          </div>
        }
        flush
      >
        <FinancialTable caption="Payroll, Kartik 2083" columns={columns} rows={PAYROLL} rowKey={(r) => r.employee.id} emptyTitle="No employees" />
        <p className="bz-total" data-testid="bz-payroll-total">
          Totals: gross {rs(t.gross)}, SSF {rs(t.ssf)}, CIT {rs(t.cit)}, TDS {rs(t.tds)}, net {rs(t.net)}. The accounting app posts the same figures each month as the payroll journal.
        </p>
      </Card>
      <Card
        title="Payslips"
        description={state.payroll === 'review' ? 'Approve the run to issue payslips.' : 'Choose an employee; Print prints the payslip alone.'}
        headingLevel={3}
        action={state.payroll !== 'review' ? <Select label="Employee" labelPlacement="hidden" size="sm" value={employeeId} onChange={setEmployeeId} options={PAYROLL.map((r) => ({ value: r.employee.id, label: r.employee.name }))} testId="bz-slip-pick" /> : undefined}
      >
        {state.payroll === 'review' ? (
          <p className="app-muted">Five payslips will be ready here. Check each person&apos;s tax on the Income tax screen first.</p>
        ) : (
          <div className="bz-print">
            <Payslip
              employer={{ name: COMPANY.name, detail: COMPANY.address, pan: COMPANY.pan }}
              employee={{
                name: slip.employee.name,
                detail: `${slip.employee.code} · ${slip.employee.designation}`,
                pan: slip.employee.pan,
                facts: [{ label: 'SSF number', value: slip.employee.ssfNumber }, { label: 'Bank account', value: `•••• ${slip.employee.account}` }, { label: 'Filing status', value: slip.employee.status === 'couple' ? 'Couple' : 'Single' }],
              }}
              period="Kartik 2083"
              payDate={state.payroll === 'paid' ? '1 Mangsir 2083 (17 Nov 2026)' : 'To be paid 1 Mangsir 2083'}
              earnings={slip.earnings}
              deductions={slip.deductions}
              notes="Computer-generated payslip; no signature needed. TDS is from example slabs in the shape of FY 2083/84."
              headingLevel={3}
              printable
              testId="bz-slip"
            />
          </div>
        )}
        <div className="bz-actions">
          <Button size="sm" variant="secondary" onClick={() => go('tax')}>Check the tax</Button>
        </div>
      </Card>
    </div>
  );
}
