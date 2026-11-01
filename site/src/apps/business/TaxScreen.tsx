import { useCallback, useState } from 'react';
import { Card } from '@punji/ui/card';
import { IncomeTaxCalculator, type IncomeTaxCalculatorResult } from '@punji/ui/income-tax-calculator';
import { divideRounded } from '@punji/ui/calculations';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { PAYROLL, RETIREMENT_RULE, SLABS, TAX_NOTE, decimal, rs } from '../shared/books.ts';

/** The income tax calculator opened on an employee's year (twelve months' pay, SSF and CIT), beside the TDS the
 *  payroll withholds each month: one twelfth of the year's tax. */
export default function TaxScreen() {
  const [employeeId, setEmployeeId] = useState(PAYROLL[0]!.employee.id);
  const [result, setResult] = useState<IncomeTaxCalculatorResult | null>(null);
  const row = PAYROLL.find((r) => r.employee.id === employeeId)!;
  const onResult = useCallback((r: IncomeTaxCalculatorResult) => setResult(r), []);
  const monthly = result ? divideRounded(result.tax.tax, 12n, 'half-up') : null;
  return (
    <div className="app-stack">
      <ScreenTitle aside={<Select label="Employee" labelPlacement="inline" size="sm" value={employeeId} onChange={(id) => { setResult(null); setEmployeeId(id); }} options={PAYROLL.map((r) => ({ value: r.employee.id, label: r.employee.name }))} testId="bz-tax-employee" />}>
        Income tax
      </ScreenTitle>
      <Card title={`${row.employee.name}, FY 2083/84`} description={`${row.employee.designation}. Twelve months of gross pay ${rs(row.gross)}, SSF ${rs(row.ssf)} and CIT ${rs(row.cit)} a month.`} headingLevel={3}>
        <IncomeTaxCalculator
          key={employeeId}
          fiscalYear={TAX_NOTE}
          slabs={SLABS}
          retirementRule={RETIREMENT_RULE}
          defaultValues={{ income: decimal(row.annual.income), status: row.employee.status, ssf: true, amounts: { ssf: decimal(row.annual.ssf), cit: decimal(row.annual.cit) } }}
          onResult={onResult}
          testId="bz-itax"
        />
      </Card>
      {monthly !== null &&
        (monthly === row.tds ? (
          <Note quiet>✓ One twelfth of {rs(result!.tax.tax)} is {rs(monthly)}, the TDS on {row.employee.name}&apos;s Kartik payslip.</Note>
        ) : (
          <Note tone="warn">With these figures the monthly tax would be {rs(monthly)}; the payroll withholds {rs(row.tds)} from the figures on file.</Note>
        ))}
    </div>
  );
}
