/**
 * Income tax from slabs you pass as data. The package ships no tax table: rates and thresholds change with each
 * budget, so the application supplies the slabs for the fiscal year and filing status in question (docs/TAX.md has
 * an example table to start from, not to rely on). Amounts are bigint minor units; each band's tax is rounded with
 * the caller's RoundingMode and the total is the exact sum of the bands shown.
 */
import { applyRate, divideRounded, parseRate, type ExactRate, type RoundingMode } from '../calculations/rounding.ts';

export interface TaxSlab {
  /** Width of this band in minor units ("the next 2 lakh"), or null for everything above the previous bands. Only the last slab may be null. */
  width: bigint | null;
  /** Rate on this band as a decimal fraction ('0.01', '0.36'). */
  rate: string;
  /** Your name for the band, for example "Social security tax". */
  label?: string;
  /** This band's tax is not charged when `waive` is set, for example the 1% social security tax for a contributor to the Social Security Fund. */
  waivable?: boolean;
}

export interface TaxBand {
  /** Index of the slab. */
  index: number;
  label?: string;
  /** Income at which this band starts (exclusive) and ends (inclusive); `to` is null for an open top band. */
  from: bigint;
  to: bigint | null;
  rate: string;
  /** The part of the income taxed in this band. */
  taxed: bigint;
  /** Tax on that part, rounded; 0n when waived. */
  tax: bigint;
  waived: boolean;
}

export interface TaxRebate {
  label: string;
  /** A fraction of the tax ('0.1' for a 10% rebate). */
  rate: string;
}

export interface IncomeTaxOptions {
  rounding: RoundingMode;
  /** Do not charge the slabs marked `waivable`. */
  waive?: boolean;
  /** Rebates on the tax after the bands, applied one after the other on the tax before rebates. */
  rebates?: readonly TaxRebate[];
}

export interface IncomeTaxResult {
  /** The taxable income given. */
  taxable: bigint;
  bands: TaxBand[];
  /** Sum of band taxes. */
  grossTax: bigint;
  rebates: { label: string; rate: string; amount: bigint }[];
  /** grossTax − rebates, never below zero. */
  tax: bigint;
  /** Income after tax: taxable − tax. */
  net: bigint;
  /** Effective rate in percent units for display only (tax / taxable × 100), null when there is no income. */
  effectiveRate: number | null;
  /** The rate of the highest band that taxed any income, for display. */
  marginalRate: string | null;
}

function checkSlabs(slabs: readonly TaxSlab[]) {
  if (slabs.length === 0) throw new RangeError('At least one tax slab is needed');
  slabs.forEach((slab, index) => {
    if (slab.width === null && index !== slabs.length - 1) throw new RangeError('Only the last slab can be open (width null)');
    if (slab.width !== null && (typeof slab.width !== 'bigint' || slab.width <= 0n)) throw new RangeError('Slab width must be a positive bigint');
    parseRate(slab.rate);
  });
}

/** Tax on a taxable income across the slabs. Income past a closed last slab is untaxed, so end with an open slab. */
export function computeIncomeTax(taxable: bigint, slabs: readonly TaxSlab[], options: IncomeTaxOptions): IncomeTaxResult {
  if (typeof taxable !== 'bigint') throw new TypeError('Taxable income must be bigint minor units');
  checkSlabs(slabs);
  const income = taxable < 0n ? 0n : taxable;
  const bands: TaxBand[] = [];
  let from = 0n;
  let marginalRate: string | null = null;
  slabs.forEach((slab, index) => {
    const to = slab.width === null ? null : from + slab.width;
    const top = to === null || income < to ? income : to;
    const taxed = top > from ? top - from : 0n;
    const waived = Boolean(options.waive && slab.waivable);
    const tax = waived ? 0n : applyRate(taxed, slab.rate, options.rounding);
    if (taxed > 0n) marginalRate = slab.rate;
    bands.push({ index, ...(slab.label === undefined ? {} : { label: slab.label }), from, to, rate: slab.rate, taxed, tax, waived });
    if (to !== null) from = to;
  });
  const grossTax = bands.reduce((sum, band) => sum + band.tax, 0n);
  const rebates = (options.rebates ?? []).map((rebate) => ({ ...rebate, amount: applyRate(grossTax, rebate.rate, options.rounding) }));
  const relief = rebates.reduce((sum, rebate) => sum + rebate.amount, 0n);
  const tax = grossTax > relief ? grossTax - relief : 0n;
  const effectiveRate = income > 0n ? Number(divideRounded(tax * 1_000_000n, income, 'half-even')) / 10_000 : null;
  return { taxable: income, bands, grossTax, rebates, tax, net: income - tax, effectiveRate, marginalRate };
}

export interface TaxDeduction {
  id: string;
  label: string;
  /** What was paid, in minor units. */
  amount: bigint;
  /** The most that may be deducted for it, if limited. */
  cap?: bigint;
}

export interface RetirementRule {
  /** Most that contributions together may reduce income by (in minor units). */
  cap?: bigint;
  /** Most as a fraction of the income ({ numerator: 1n, denominator: 3n } for one third). */
  fraction?: ExactRate;
}

export interface TaxableIncomeInput {
  /** Assessable income for the year, in minor units. */
  income: bigint;
  /** Contributions to retirement funds (SSF, CIT, PF, approved funds), limited together by `retirementRule`. */
  retirement?: readonly TaxDeduction[];
  retirementRule?: RetirementRule;
  /** Other deductions, each limited by its own cap (insurance premium, health insurance, ...). */
  deductions?: readonly TaxDeduction[];
  rounding: RoundingMode;
}

export interface TaxableIncomeResult {
  income: bigint;
  /** Sum of retirement contributions given. */
  retirementPaid: bigint;
  /** What they may reduce income by after the rule. */
  retirementAllowed: bigint;
  /** Each other deduction with what is allowed after its cap. */
  deductions: { id: string; label: string; amount: bigint; allowed: bigint }[];
  /** retirementAllowed + other allowed deductions. */
  totalDeductions: bigint;
  /** income − totalDeductions, never below zero. */
  taxable: bigint;
}

const min = (...values: bigint[]) => values.reduce((a, b) => (b < a ? b : a));

/** Taxable income after capped deductions. The caps are your data; nothing here knows a fiscal year's limits. */
export function taxableIncome(input: TaxableIncomeInput): TaxableIncomeResult {
  const { income } = input;
  if (typeof income !== 'bigint') throw new TypeError('Income must be bigint minor units');
  for (const d of [...(input.retirement ?? []), ...(input.deductions ?? [])]) {
    if (typeof d.amount !== 'bigint' || d.amount < 0n) throw new RangeError(`Deduction ${d.id} must be a non-negative bigint`);
    if (d.cap !== undefined && d.cap < 0n) throw new RangeError(`Deduction ${d.id} cap cannot be negative`);
  }
  const base = income < 0n ? 0n : income;
  const retirementPaid = (input.retirement ?? []).reduce((sum, d) => sum + (d.cap === undefined ? d.amount : min(d.amount, d.cap)), 0n);
  const limits = [retirementPaid];
  if (input.retirementRule?.cap !== undefined) limits.push(input.retirementRule.cap);
  if (input.retirementRule?.fraction) limits.push(divideRounded(base * input.retirementRule.fraction.numerator, input.retirementRule.fraction.denominator, input.rounding));
  const retirementAllowed = min(...limits);
  const deductions = (input.deductions ?? []).map((d) => ({ id: d.id, label: d.label, amount: d.amount, allowed: d.cap === undefined ? d.amount : min(d.amount, d.cap) }));
  const totalDeductions = retirementAllowed + deductions.reduce((sum, d) => sum + d.allowed, 0n);
  return { income: base, retirementPaid, retirementAllowed, deductions, totalDeductions, taxable: base > totalDeductions ? base - totalDeductions : 0n };
}
