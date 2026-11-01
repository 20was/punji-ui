/**
 * Exact invoice arithmetic: line amounts, line and invoice discounts, the taxable and exempt amounts, VAT and the
 * total, all in bigint minor units. Every step that can leave a fraction takes the caller's RoundingMode.
 *
 * It is arithmetic, not tax law. The VAT rate, what is exempt, how a discount is shared and how a total is rounded
 * are your rules: pass them in. The server that issues the bill must compute it again.
 */
import { applyRate, divideRounded, parseRate, type ExactRate, type RoundingMode } from '../calculations/rounding.ts';

export interface InvoiceLineInput {
  /** Stable id of the line. */
  id: string;
  /** Quantity: a bigint count, or an exact decimal string for weights and hours ('2.5'). Never negative. */
  quantity: bigint | string;
  /** Price of one unit in minor units, before VAT. Never negative. */
  rate: bigint;
  /** A discount on this line in minor units, at most the line amount. */
  discount?: bigint;
  /** Whether VAT applies to this line. Default true. Set false for an exempt or zero-rated item. */
  taxable?: boolean;
}

export interface InvoiceDiscount {
  /** A fixed discount in minor units, or a fraction of the amount after line discounts ('0.05' is 5%). */
  amount?: bigint;
  rate?: string | ExactRate;
}

export interface InvoiceOptions {
  /** VAT rate as a decimal fraction ('0.13' for 13%). Pass the rate in force on the invoice date. */
  vatRate: string | ExactRate;
  /** How fractions round: line amounts with a decimal quantity, a percentage discount, its split and VAT. */
  rounding: RoundingMode;
  /** A discount on the whole invoice, shared between the taxable and exempt amounts in proportion. */
  discount?: InvoiceDiscount;
}

export interface InvoiceLineTotals {
  id: string;
  /** quantity × rate, rounded when the quantity has a fraction. */
  amount: bigint;
  /** The line's own discount. */
  discount: bigint;
  /** amount − discount. */
  net: bigint;
  taxable: boolean;
}

export interface InvoiceTotals {
  lines: InvoiceLineTotals[];
  /** Sum of line amounts before any discount. */
  subtotal: bigint;
  /** Sum of line discounts. */
  lineDiscount: bigint;
  /** The invoice discount (fixed, or the rate applied to subtotal − line discounts). */
  invoiceDiscount: bigint;
  /** lineDiscount + invoiceDiscount. */
  discount: bigint;
  /** Taxable lines after their share of the discount: the amount VAT is charged on. */
  taxable: bigint;
  /** Exempt and zero-rated lines after their share of the discount. */
  exempt: bigint;
  /** VAT on `taxable`, rounded once. */
  vat: bigint;
  /** taxable + exempt + vat. */
  total: bigint;
}

function lineAmount(quantity: bigint | string, rate: bigint, rounding: RoundingMode): bigint {
  if (typeof quantity === 'bigint') {
    if (quantity < 0n) throw new RangeError('Line quantity cannot be negative');
    return quantity * rate;
  }
  return applyRate(rate, parseRate(quantity), rounding);
}

/**
 * Totals for an invoice. Throws `TypeError` for a non-bigint amount or a malformed quantity or rate, and `RangeError`
 * for a negative quantity, rate or discount, or a discount larger than what it applies to.
 */
export function computeInvoice(lines: readonly InvoiceLineInput[], options: InvoiceOptions): InvoiceTotals {
  const vatRate = typeof options.vatRate === 'string' ? parseRate(options.vatRate) : options.vatRate;
  const { rounding } = options;
  const totals: InvoiceLineTotals[] = lines.map((line) => {
    if (typeof line.rate !== 'bigint') throw new TypeError(`Line ${line.id}: rate must be bigint minor units`);
    if (line.rate < 0n) throw new RangeError(`Line ${line.id}: rate cannot be negative`);
    const amount = lineAmount(line.quantity, line.rate, rounding);
    const discount = line.discount ?? 0n;
    if (typeof discount !== 'bigint') throw new TypeError(`Line ${line.id}: discount must be bigint minor units`);
    if (discount < 0n || discount > amount) throw new RangeError(`Line ${line.id}: discount must be from zero to the line amount`);
    return { id: line.id, amount, discount, net: amount - discount, taxable: line.taxable !== false };
  });
  let subtotal = 0n, lineDiscount = 0n, taxableNet = 0n, exemptNet = 0n;
  for (const line of totals) {
    subtotal += line.amount;
    lineDiscount += line.discount;
    if (line.taxable) taxableNet += line.net; else exemptNet += line.net;
  }
  const net = taxableNet + exemptNet;
  const spec = options.discount;
  let invoiceDiscount = 0n;
  if (spec?.amount !== undefined && spec.rate !== undefined) throw new TypeError('Give the invoice discount as an amount or a rate, not both');
  if (spec?.amount !== undefined) {
    if (typeof spec.amount !== 'bigint') throw new TypeError('Invoice discount must be bigint minor units');
    invoiceDiscount = spec.amount;
  } else if (spec?.rate !== undefined) {
    invoiceDiscount = applyRate(net, spec.rate, rounding);
  }
  if (invoiceDiscount < 0n || invoiceDiscount > net) throw new RangeError('Invoice discount must be from zero to the amount after line discounts');
  // Share the invoice discount in proportion; the exempt share is the remainder, so the two parts sum exactly.
  const taxableShare = net === 0n ? 0n : divideRounded(invoiceDiscount * taxableNet, net, rounding);
  const taxable = taxableNet - taxableShare;
  const exempt = exemptNet - (invoiceDiscount - taxableShare);
  const vat = divideRounded(taxable * vatRate.numerator, vatRate.denominator, rounding);
  return { lines: totals, subtotal, lineDiscount, invoiceDiscount, discount: lineDiscount + invoiceDiscount, taxable, exempt, vat, total: taxable + exempt + vat };
}

/** A VAT rate string such as '0.13' as a percent for display: '13'. Exact; no floating point. */
export function ratePercent(rate: string | ExactRate): string {
  const { numerator, denominator } = typeof rate === 'string' ? parseRate(rate) : rate;
  // Percent = numerator × 100 / denominator, written as an exact decimal when it terminates within 6 places.
  const scaled = numerator * 100n * 1_000_000n;
  if (scaled % denominator !== 0n) {
    const rounded = divideRounded(scaled, denominator, 'half-even');
    return trimDecimal(rounded);
  }
  return trimDecimal(scaled / denominator);
}

function trimDecimal(millionths: bigint): string {
  const whole = millionths / 1_000_000n;
  const fraction = (millionths % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
