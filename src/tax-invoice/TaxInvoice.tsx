'use client';

/**
 * TaxInvoice: a printable VAT invoice (tax bill). Seller and buyer with their PAN or VAT numbers, the invoice number,
 * the date in Bikram Sambat and Gregorian, line items, discount, taxable and exempt amounts, VAT at the rate you pass
 * (default 13%), the total and the amount in words. Every figure is exact bigint arithmetic from `computeInvoice`.
 *
 * It lays out a bill; it is not a billing system. Invoice numbering, the VAT rate in force, what is exempt, copies
 * and cancellations, and reporting to the tax authority are yours, and the server that issues the bill must compute
 * the figures again. Print: the invoice has its own print styles (plain background, no buttons, rows not split).
 */
import { useEffect, useId, useMemo, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { currencyExponent } from '../money/money.ts';
import { formatBSDate, gregorianToBS } from '../nepal/calendar.ts';
import type { CalendarDate } from '../nepal/date-only.ts';
import { Note } from '../states/States.tsx';
import type { RoundingMode } from '../calculations/rounding.ts';
import { computeInvoice, ratePercent, type InvoiceDiscount, type InvoiceTotals } from '../tax/invoice.ts';
import { formatPanNumber } from '../tax/pan.ts';
import { amountInWords, type AmountInWordsOptions } from '../tax/words.ts';
import { showDigits } from '../internal/digits.ts';

export interface InvoiceParty {
  /** Registered name. */
  name: string;
  /** Address lines, printed as given. */
  address?: string;
  /** PAN or VAT number (nine digits). */
  pan?: string;
  /** Phone, email or another contact line. */
  contact?: string;
}

export interface TaxInvoiceLine {
  /** Stable id of the line. */
  id: string;
  /** What was sold. */
  description: string;
  /** A second line: a model, a batch, a period. */
  detail?: string;
  /** HS code or your item code, when you print one. */
  code?: string;
  /** A bigint count or an exact decimal string ('2.5'). */
  quantity: bigint | string;
  /** Unit name ('pcs', 'kg', 'hr'). */
  unit?: string;
  /** Price of one unit before VAT, in minor units. */
  rate: bigint;
  /** Discount on this line in minor units. */
  discount?: bigint;
  /** False for an exempt or zero-rated item. Default true. */
  taxable?: boolean;
}

export interface TaxInvoiceLabels {
  title: string; invoiceNumber: string; date: string; dateBS: string; dateAD: string; dueDate: string; paymentMode: string;
  seller: string; buyer: string; pan: string; serial: string; description: string; code: string; quantity: string; rate: string; amount: string;
  subtotal: string; discount: string; taxable: string; exempt: string; vat: string; total: string; inWords: string; exemptMark: string;
  signature: string; print: string; lines: string; invalid: string;
}

export const DEFAULT_TAX_INVOICE_LABELS: TaxInvoiceLabels = {
  title: 'Tax invoice', invoiceNumber: 'Invoice no.', date: 'Date', dateBS: 'BS', dateAD: 'AD', dueDate: 'Due date', paymentMode: 'Payment',
  seller: 'Seller', buyer: 'Bill to', pan: 'PAN/VAT', serial: 'S.N.', description: 'Particulars', code: 'Code', quantity: 'Qty', rate: 'Rate', amount: 'Amount',
  subtotal: 'Subtotal', discount: 'Discount', taxable: 'Taxable amount', exempt: 'Exempt amount', vat: 'VAT', total: 'Total', inWords: 'In words',
  exemptMark: 'exempt', signature: 'Authorised signature', print: 'Print invoice', lines: 'Items',
  invalid: 'A line has a negative or malformed amount, so this invoice cannot be totalled.',
};

export interface TaxInvoiceProps {
  /** The business issuing the bill: name, address, contact and PAN/VAT number. */
  seller: InvoiceParty;
  /** Who is billed: name, address and PAN/VAT number (required on a VAT invoice above the threshold your law sets). */
  buyer: InvoiceParty;
  /** The invoice number from your sequence, printed as given. */
  invoiceNumber: string;
  /** Invoice date (Gregorian, date-only). Printed in BS and AD. */
  date: CalendarDate;
  /** Due date, printed in BS and AD. */
  dueDate?: CalendarDate;
  /** How it is paid: 'Cash', 'Credit', 'Bank transfer'. */
  paymentMode?: string;
  /** The items, in the order to print. Amounts in minor units. */
  lines: readonly TaxInvoiceLine[];
  /** A discount on the whole invoice: `{ amount }` in minor units or `{ rate: '0.05' }`. */
  discount?: InvoiceDiscount;
  /** VAT rate as a decimal fraction. Default '0.13'. Pass the rate in force on the invoice date. */
  vatRate?: string;
  /** Rounding for VAT, decimal quantities and a percentage discount. Default 'half-up'. */
  rounding?: RoundingMode;
  /** Currency and locale of the amounts. Default NPR, en-IN grouping, no currency mark (the currency is named in `currencyNote`). */
  money?: MoneyFormatConfig;
  /** Line under the items table naming the currency. Default 'Amounts in NPR'. */
  currencyNote?: ReactNode;
  /** Amount in words options, or false to leave the line out. Default English rupees and paisa. */
  words?: AmountInWordsOptions | false;
  /** Language of the BS date. Default 'en'. */
  language?: 'en' | 'ne';
  /** Digits of the BS date. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** A mark beside the title, for a reprint: 'Copy of original (1)'. */
  copyMark?: ReactNode;
  /** Remarks, terms or bank details under the totals. */
  notes?: ReactNode;
  /** A logo or seal for the header. */
  logo?: ReactNode;
  /** Show the code column. Default: when any line has a code. */
  showCode?: boolean;
  /** Show the signature line. Default true. */
  signature?: boolean;
  /** Show a Print button (hidden when printed). Default false. */
  printable?: boolean;
  /** Called with the totals after they are computed, to compare with your server's. */
  onTotals?: (totals: InvoiceTotals) => void;
  /** Words, in the reader's language. */
  labels?: Partial<TaxInvoiceLabels>;
  /** Heading level of the title. Default 2. */
  headingLevel?: 2 | 3;
  /** Extra class on the article, for layout. */
  className?: string;
  /** Sets `data-testid` on the invoice. */
  testId?: string;
}

const iso = (d: CalendarDate) => `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

function Party({ heading, party, words }: { heading: string; party: InvoiceParty; words: TaxInvoiceLabels }) {
  return (
    <section className="pu-inv-party" aria-label={heading}>
      <p className="pu-inv-label">{heading}</p>
      <p className="pu-inv-name">{party.name}</p>
      {party.address && <p className="pu-inv-sub">{party.address}</p>}
      {party.contact && <p className="pu-inv-sub">{party.contact}</p>}
      {party.pan && <p className="pu-inv-pan"><span>{words.pan}</span> <span className="pu-inv-pan-no">{formatPanNumber(party.pan)}</span></p>}
    </section>
  );
}

function DateCell({ date, language, digits, words }: { date: CalendarDate; language: 'en' | 'ne'; digits: 'latn' | 'deva'; words: TaxInvoiceLabels }) {
  let bs: string | null = null;
  try { bs = formatBSDate(gregorianToBS(date), { language, digits }); } catch { bs = null; }
  const ad = iso(date);
  return (
    <>
      {bs && <span className="pu-inv-date">{bs} <abbr className="pu-inv-cal">{words.dateBS}</abbr></span>}
      <span className="pu-inv-date"><time dateTime={ad}>{showDigits(ad, digits)}</time> <abbr className="pu-inv-cal">{words.dateAD}</abbr></span>
    </>
  );
}

const quantityText = (quantity: bigint | string) => (typeof quantity === 'bigint' ? quantity.toString() : quantity);

export function TaxInvoice({
  seller, buyer, invoiceNumber, date, dueDate, paymentMode, lines, discount, vatRate = '0.13', rounding = 'half-up', money = nepalLedgerMoney,
  currencyNote, words: wordsOption, language = 'en', digits = 'latn', copyMark, notes, logo, showCode, signature = true, printable, onTotals,
  labels, headingLevel = 2, className, testId,
}: TaxInvoiceProps) {
  const words = { ...DEFAULT_TAX_INVOICE_LABELS, ...labels };
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const totals = useMemo(() => {
    try { return computeInvoice(lines, { vatRate, rounding, ...(discount ? { discount } : {}) }); } catch { return null; }
  }, [lines, vatRate, rounding, discount]);
  useEffect(() => { if (totals && onTotals) onTotals(totals); }, [totals, onTotals]);
  const amount = (value: bigint, id?: string) => <MoneyDisplay value={value} preset={money} testId={id && testId ? `${testId}-${id}` : undefined} />;
  const codes = showCode ?? lines.some((line) => line.code);
  const exponent = currencyExponent(money.currency);
  const inWords = totals && wordsOption !== false ? amountInWords(totals.total, { scale: exponent, ...(language === 'ne' ? { language: 'ne' as const } : {}), ...wordsOption }) : null;
  const pct = ratePercent(vatRate);
  return (
    <article className={`pu-inv${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-t`} data-testid={testId}>
      <header className="pu-inv-head">
        <div className="pu-inv-seller">
          {logo && <div className="pu-inv-logo">{logo}</div>}
          <div>
            <p className="pu-inv-seller-name">{seller.name}</p>
            {seller.address && <p className="pu-inv-sub">{seller.address}</p>}
            {seller.contact && <p className="pu-inv-sub">{seller.contact}</p>}
            {seller.pan && <p className="pu-inv-pan"><span>{words.pan}</span> <span className="pu-inv-pan-no" data-testid={testId ? `${testId}-seller-pan` : undefined}>{formatPanNumber(seller.pan)}</span></p>}
          </div>
        </div>
        <div className="pu-inv-titlebox">
          <Heading className="pu-inv-title" id={`${uid}-t`}>{words.title}</Heading>
          {copyMark && <p className="pu-inv-copy">{copyMark}</p>}
        </div>
      </header>

      <div className="pu-inv-meta">
        <Party heading={words.buyer} party={buyer} words={words} />
        <dl className="pu-inv-facts">
          <div><dt>{words.invoiceNumber}</dt><dd className="pu-inv-no" data-testid={testId ? `${testId}-number` : undefined}>{invoiceNumber}</dd></div>
          <div><dt>{words.date}</dt><dd><DateCell date={date} language={language} digits={digits} words={words} /></dd></div>
          {dueDate && <div><dt>{words.dueDate}</dt><dd><DateCell date={dueDate} language={language} digits={digits} words={words} /></dd></div>}
          {paymentMode && <div><dt>{words.paymentMode}</dt><dd>{paymentMode}</dd></div>}
        </dl>
      </div>

      {totals === null ? (
        <div role="alert" data-testid={testId ? `${testId}-invalid` : undefined}><Note tone="error">{words.invalid}</Note></div>
      ) : (
        <>
          {/* Scrolls sideways on a narrow screen, so it takes focus and is named by the caption. */}
          <div className="pu-inv-tablebox" role="region" aria-labelledby={`${uid}-lines`} tabIndex={0}>
            <table className="pu-inv-table">
              <caption className="kit-sr" id={`${uid}-lines`}>{words.lines}</caption>
              <thead>
                <tr>
                  <th scope="col" className="pu-inv-sn">{words.serial}</th>
                  <th scope="col">{words.description}</th>
                  {codes && <th scope="col" className="pu-inv-code">{words.code}</th>}
                  <th scope="col" className="num">{words.quantity}</th>
                  <th scope="col" className="num">{words.rate}</th>
                  <th scope="col" className="num">{words.amount}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const computed = totals.lines[index]!;
                  return (
                    <tr key={line.id} data-testid={testId ? `${testId}-line-${line.id}` : undefined}>
                      <td className="pu-inv-sn">{index + 1}</td>
                      <th scope="row" className="pu-inv-desc">
                        <span>{line.description}</span>
                        {!computed.taxable && <span className="pu-inv-exempt"> ({words.exemptMark})</span>}
                        {line.detail && <small>{line.detail}</small>}
                        {computed.discount > 0n && <small>{words.discount} {amount(computed.discount)}</small>}
                      </th>
                      {codes && <td className="pu-inv-code">{line.code ?? ''}</td>}
                      <td className="num">{quantityText(line.quantity)}{line.unit ? <span className="pu-inv-unit"> {line.unit}</span> : null}</td>
                      <td className="num">{amount(line.rate)}</td>
                      <td className="num">{amount(computed.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pu-inv-foot">
            <div className="pu-inv-left">
              <p className="pu-inv-currency">{currencyNote ?? `Amounts in ${money.currency}`}</p>
              {inWords && (
                <p className="pu-inv-words" data-testid={testId ? `${testId}-words` : undefined}>
                  <span className="pu-inv-label">{words.inWords}</span> {inWords}
                </p>
              )}
              {notes && <div className="pu-inv-notes">{notes}</div>}
            </div>
            <dl className="pu-inv-sum">
              <div><dt>{words.subtotal}</dt><dd>{amount(totals.subtotal, 'subtotal')}</dd></div>
              {totals.discount > 0n && <div><dt>{words.discount}</dt><dd>{amount(totals.discount, 'discount')}</dd></div>}
              <div><dt>{words.taxable}</dt><dd>{amount(totals.taxable, 'taxable')}</dd></div>
              {totals.exempt !== 0n && <div><dt>{words.exempt}</dt><dd>{amount(totals.exempt, 'exempt')}</dd></div>}
              <div><dt>{`${words.vat} ${pct}%`}</dt><dd>{amount(totals.vat, 'vat')}</dd></div>
              <div className="pu-inv-total"><dt>{words.total}</dt><dd>{amount(totals.total, 'total')}</dd></div>
            </dl>
          </div>
        </>
      )}

      {(signature || printable) && (
        <footer className="pu-inv-end">
          {signature && <p className="pu-inv-sign">{words.signature}</p>}
          {printable && <div className="pu-inv-noprint"><Button variant="secondary" size="sm" onClick={() => window.print()} testId={testId ? `${testId}-print` : undefined}>{words.print}</Button></div>}
        </footer>
      )}
    </article>
  );
}
