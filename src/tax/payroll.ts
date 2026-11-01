/**
 * Payslip totals: earnings, deductions and net pay, exact bigint sums. The lines (basic salary, allowances, SSF, CIT,
 * TDS, advances) and their amounts come from your payroll; nothing here computes a salary or a statutory rate.
 */

export interface PayLine {
  id: string;
  label: string;
  /** Amount in minor units, never negative. */
  amount: bigint;
  /** A note under the label: a rate, a period or a basis ("11% of basic"). */
  detail?: string;
}

export interface PayslipTotals {
  /** Sum of earnings. */
  gross: bigint;
  /** Sum of deductions. */
  deductions: bigint;
  /** gross − deductions. Can be negative when deductions exceed earnings; show it, do not hide it. */
  net: bigint;
}

/** Totals of a payslip. Throws RangeError for a negative or non-bigint line. */
export function payslipTotals(earnings: readonly PayLine[], deductions: readonly PayLine[]): PayslipTotals {
  const sum = (lines: readonly PayLine[]) => lines.reduce((total, line) => {
    if (typeof line.amount !== 'bigint' || line.amount < 0n) throw new RangeError(`Pay line ${line.id}: amount must be a non-negative bigint`);
    return total + line.amount;
  }, 0n);
  const gross = sum(earnings);
  const taken = sum(deductions);
  return { gross, deductions: taken, net: gross - taken };
}
