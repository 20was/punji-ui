// The business both finance apps keep the books of: one invented Nepali IT services company, its customers, its
// staff and their pay. Pure TypeScript (no React, no clock): payroll here is what the business app runs and what the
// accounting app posts every month, so a payslip, the payroll total and the salary journal agree to the paisa.
// Tax slabs are EXAMPLE data in the shape of Nepal's resident individual table, not tax advice.
import { applyRate, divideRounded } from '@punji/ui/calculations';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import { computeIncomeTax, taxableIncome, type IncomeTaxResult, type PayLine, type TaxSlab } from '@punji/ui/tax';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);

/** The session date every app shares: 1 November 2026 (15 Kartik 2083). */
export const TODAY: CalendarDate = { year: 2026, month: 11, day: 1 };

export const COMPANY = {
  name: 'Sagarmatha Digital Pvt. Ltd.',
  address: 'Jhamsikhel, Lalitpur-3, Bagmati',
  contact: '01-5550123 · accounts@example.com.np',
  pan: '609123457',
  bank: 'NIC Asia Bank, current account 0123-4567-8901',
};

// ---- Dates (date-only, Gregorian; no time zone can move a day) ----
const DAY = 86_400_000;
export const dayNumber = (d: CalendarDate) => Math.floor(Date.UTC(d.year, d.month - 1, d.day) / DAY);
export const fromDayNumber = (n: number): CalendarDate => {
  const t = new Date(n * DAY);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};
export const addDays = (d: CalendarDate, days: number) => fromDayNumber(dayNumber(d) + days);
export const compareDates = (a: CalendarDate, b: CalendarDate) => dayNumber(a) - dayNumber(b);
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: CalendarDate) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;
export const parseIsoDate = (text: string): CalendarDate | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isoDate(fromDayNumber(dayNumber(d))) === text ? d : null;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "1 Nov 2026": short, fixed English, the same on the server and in the browser. */
export const shortDate = (d: CalendarDate) => `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;

/** Paisa as an exact decimal string in rupees ("1234.50"), for CSV and form values. */
export const decimal = (paisa: bigint) => {
  const abs = paisa < 0n ? -paisa : paisa;
  return `${paisa < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
};

// ---- Customers ----
export interface Customer {
  id: string;
  name: string;
  pan: string;
  address: string;
  contact: string;
  /** Credit terms in days. */
  terms: number;
}

export const CUSTOMERS: readonly Customer[] = [
  { id: 'c-everest', name: 'Everest Stores Pvt. Ltd.', pan: '301234567', address: 'New Road, Kathmandu-22', contact: 'Anita Shrestha · 01-4221234', terms: 30 },
  { id: 'c-himal', name: 'Himal Traders', pan: '602345678', address: 'Mahendrapul, Pokhara-9', contact: 'Rajesh Gurung · 061-520111', terms: 30 },
  { id: 'c-lumbini', name: 'Lumbini Mart Pvt. Ltd.', pan: '303456789', address: 'Traffic Chowk, Butwal-6', contact: 'Sabina Thapa · 071-540222', terms: 45 },
  { id: 'c-fewa', name: 'Fewa Guest House', pan: '604567890', address: 'Lakeside, Pokhara-6', contact: 'Bikash Rai · 061-460333', terms: 15 },
  { id: 'c-janakpur', name: 'Janakpur Agro Co-operative', pan: '305678901', address: 'Bhanu Chowk, Janakpur-4', contact: 'Ram Yadav · 041-525444', terms: 60 },
  { id: 'c-koshi', name: 'Koshi Hospital Pvt. Ltd.', pan: '606789012', address: 'Main Road, Biratnagar-3', contact: 'Dr. Meera Karki · 021-470555', terms: 30 },
];
export const customerById = (id: string) => CUSTOMERS.find((c) => c.id === id);

// ---- Income tax (EXAMPLE slabs, amounts in paisa) ----
export const LAKH = 10_000_000n;
export const SLABS: { single: readonly TaxSlab[]; couple: readonly TaxSlab[] } = {
  single: [
    { width: 5n * LAKH, rate: '0.01', label: 'First 5 lakh (social security tax)', waivable: true },
    { width: 2n * LAKH, rate: '0.1' },
    { width: 3n * LAKH, rate: '0.2' },
    { width: 10n * LAKH, rate: '0.3' },
    { width: 30n * LAKH, rate: '0.36' },
    { width: null, rate: '0.39' },
  ],
  couple: [
    { width: 6n * LAKH, rate: '0.01', label: 'First 6 lakh (social security tax)', waivable: true },
    { width: 2n * LAKH, rate: '0.1' },
    { width: 3n * LAKH, rate: '0.2' },
    { width: 9n * LAKH, rate: '0.3' },
    { width: 30n * LAKH, rate: '0.36' },
    { width: null, rate: '0.39' },
  ],
};
/** Retirement contributions together reduce income by at most 5 lakh and one third of it (example rule). */
export const RETIREMENT_RULE = { cap: 5n * LAKH, fraction: { numerator: 1n, denominator: 3n } };
export const TAX_NOTE = 'Example slabs in the shape of FY 2083/84. Check the current Finance Act before relying on them.';

// ---- Staff and payroll ----
export interface Employee {
  id: string;
  code: string;
  name: string;
  designation: string;
  pan: string;
  ssfNumber: string;
  status: 'single' | 'couple';
  /** Monthly basic salary, paisa. */
  basic: bigint;
  /** Monthly allowances, paisa. */
  allowance: bigint;
  /** Monthly contribution to the Citizen Investment Trust, paisa. */
  cit: bigint;
  /** Last four digits of the salary account. */
  account: string;
}

export const EMPLOYEES: readonly Employee[] = [
  { id: 'e1', code: 'EMP-001', name: 'Sita Gurung', designation: 'Head of engineering', pan: '123456789', ssfNumber: 'SSF-00412345', status: 'couple', basic: 9_500_000n, allowance: 2_000_000n, cit: 1_000_000n, account: '4821' },
  { id: 'e2', code: 'EMP-002', name: 'Prakash Adhikari', designation: 'Senior developer', pan: '234567891', ssfNumber: 'SSF-00412346', status: 'single', basic: 7_000_000n, allowance: 1_500_000n, cit: 500_000n, account: '1937' },
  { id: 'e3', code: 'EMP-003', name: 'Nirmala Tamang', designation: 'Accountant', pan: '345678912', ssfNumber: 'SSF-00412347', status: 'couple', basic: 5_000_000n, allowance: 1_000_000n, cit: 0n, account: '7714' },
  { id: 'e4', code: 'EMP-004', name: 'Aashish Karki', designation: 'Developer', pan: '456789123', ssfNumber: 'SSF-00412348', status: 'single', basic: 4_200_000n, allowance: 800_000n, cit: 200_000n, account: '3302' },
  { id: 'e5', code: 'EMP-005', name: 'Rojina Magar', designation: 'Office assistant', pan: '567891234', ssfNumber: 'SSF-00412349', status: 'single', basic: 2_200_000n, allowance: 500_000n, cit: 0n, account: '5560' },
];

export interface PayrollRow {
  employee: Employee;
  earnings: PayLine[];
  deductions: PayLine[];
  /** Basic + allowance: the salary expense. */
  salary: bigint;
  /** Employer's 20% of basic to SSF: an expense and an earning on the payslip. */
  employerSsf: bigint;
  /** Employee's 11% of basic. */
  employeeSsf: bigint;
  /** 31% of basic, deposited with the SSF. */
  ssf: bigint;
  cit: bigint;
  /** Monthly income tax withheld: the year's tax over 12, rounded half up. */
  tds: bigint;
  /** salary + employerSsf. */
  gross: bigint;
  /** gross − ssf − cit − tds: paid to the bank account. */
  net: bigint;
  /** The year behind the monthly TDS (rupee strings for the calculator, and the result). */
  annual: { income: bigint; retirement: bigint; ssf: bigint; cit: bigint; taxable: bigint; tax: IncomeTaxResult };
}

/** One month's pay for an employee: SSF 11% + 20% of basic, CIT, and TDS from the annual tax on 12 months' pay. */
export function payrollFor(employee: Employee): PayrollRow {
  const employerSsf = applyRate(employee.basic, '0.2', 'half-up');
  const employeeSsf = applyRate(employee.basic, '0.11', 'half-up');
  const ssf = employerSsf + employeeSsf;
  const salary = employee.basic + employee.allowance;
  const gross = salary + employerSsf;
  const income = gross * 12n;
  const annualSsf = ssf * 12n;
  const annualCit = employee.cit * 12n;
  const deductions = taxableIncome({
    income,
    retirement: [{ id: 'ssf', label: 'SSF', amount: annualSsf }, { id: 'cit', label: 'CIT', amount: annualCit }],
    retirementRule: RETIREMENT_RULE,
    rounding: 'half-up',
  });
  const tax = computeIncomeTax(deductions.taxable, SLABS[employee.status], { rounding: 'half-up', waive: true });
  const tds = divideRounded(tax.tax, 12n, 'half-up');
  const net = gross - ssf - employee.cit - tds;
  return {
    employee,
    earnings: [
      { id: 'basic', label: 'Basic salary', amount: employee.basic },
      { id: 'allowance', label: 'Allowance', amount: employee.allowance },
      { id: 'ssf-er', label: 'SSF, employer contribution', detail: '20% of basic', amount: employerSsf },
    ],
    deductions: [
      { id: 'ssf', label: 'SSF', detail: '31% of basic (11% employee + 20% employer)', amount: ssf },
      ...(employee.cit > 0n ? [{ id: 'cit', label: 'CIT', detail: 'Citizen Investment Trust', amount: employee.cit }] : []),
      { id: 'tds', label: 'Income tax (TDS)', detail: 'One twelfth of the year\'s tax', amount: tds },
    ],
    salary, employerSsf, employeeSsf, ssf, cit: employee.cit, tds, gross, net,
    annual: { income, retirement: deductions.retirementAllowed, ssf: annualSsf, cit: annualCit, taxable: deductions.taxable, tax },
  };
}

export interface PayrollTotals { salary: bigint; employerSsf: bigint; ssf: bigint; cit: bigint; tds: bigint; gross: bigint; net: bigint }

export function payrollTotals(rows: readonly PayrollRow[]): PayrollTotals {
  const sum = (pick: (r: PayrollRow) => bigint) => rows.reduce((s, r) => s + pick(r), 0n);
  return { salary: sum((r) => r.salary), employerSsf: sum((r) => r.employerSsf), ssf: sum((r) => r.ssf), cit: sum((r) => r.cit), tds: sum((r) => r.tds), gross: sum((r) => r.gross), net: sum((r) => r.net) };
}

/** The month's payroll for everyone, computed once. */
export const PAYROLL: readonly PayrollRow[] = EMPLOYEES.map(payrollFor);
export const PAYROLL_TOTALS = payrollTotals(PAYROLL);
