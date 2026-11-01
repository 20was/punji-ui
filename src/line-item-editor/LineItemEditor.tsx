'use client';

/**
 * LineItemEditor: the editable lines of a bill or quotation. Each line has a description, a quantity, a rate and
 * whether VAT applies; the line amount and the subtotal, taxable amount, VAT and total update as you type, with exact
 * bigint arithmetic (`computeInvoice`). Lines are added and removed with buttons; focus moves to the new line, or to
 * the next sensible control after a removal, and each change is announced.
 *
 * Controlled: the lines are drafts of what was typed (strings), so nothing is lost or rounded while editing. A line
 * whose quantity or rate is unfinished is left out of the totals and marked. Convert with `lineItemsToInvoiceLines`
 * when saving, and compute the bill again on the server.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../button/Button.tsx';
import type { RoundingMode } from '../calculations/rounding.ts';
import { CurrencyInput } from '../currency-input/CurrencyInput.tsx';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { Field } from '../fields/Fields.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { currencyExponent, getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { parseLocalizedDecimal } from '../nepal/decimal.ts';
import { parseMinorUnits } from '../nepal/money.ts';
import { computeInvoice, ratePercent, type InvoiceDiscount, type InvoiceLineInput, type InvoiceTotals } from '../tax/invoice.ts';

export interface LineItemDraft {
  id: string;
  description: string;
  /** Quantity as typed ('2', '2.5', '२'). */
  quantity: string;
  /** Rate per unit as an ASCII decimal in major units ('1250.50'), as CurrencyInput reports it. */
  rate: string;
  /** Whether VAT applies. Default true. */
  taxable?: boolean;
}

export interface LineItemConversion {
  /** Lines ready for `computeInvoice` (finished quantity and rate). */
  lines: InvoiceLineInput[];
  /** Ids of lines left out because the quantity or rate is empty or unfinished. */
  incomplete: string[];
}

/** Drafts to exact invoice lines. `exponent` is the currency's minor-unit digits (2 for NPR). */
export function lineItemsToInvoiceLines(drafts: readonly LineItemDraft[], options: { exponent?: number; quantityDigits?: number } = {}): LineItemConversion {
  const exponent = options.exponent ?? 2;
  const lines: InvoiceLineInput[] = [];
  const incomplete: string[] = [];
  for (const draft of drafts) {
    const quantity = parseLocalizedDecimal(draft.quantity, { maxFractionDigits: options.quantityDigits ?? 3, grouping: 'south-asian' });
    const rate = parseLocalizedDecimal(draft.rate, { maxFractionDigits: exponent, grouping: 'none' });
    if (quantity.state !== 'valid' || rate.state !== 'valid' || quantity.value.startsWith('-') || rate.value.startsWith('-')) {
      incomplete.push(draft.id);
      continue;
    }
    lines.push({ id: draft.id, quantity: /\./.test(quantity.value) ? quantity.value : BigInt(quantity.value), rate: parseMinorUnits(rate.value, exponent), taxable: draft.taxable !== false });
  }
  return { lines, incomplete };
}

export interface LineItemEditorLabels {
  description: string; quantity: string; rate: string; vat: string; amount: string; remove: string; add: string;
  subtotal: string; discount: string; taxable: string; exempt: string; total: string; incomplete: string; lines: string;
  amountsIn: (currency: string) => string; added: (line: number) => string; removed: (line: number) => string; totalNow: (total: string) => string; line: (line: number) => string;
}

export const DEFAULT_LINE_ITEM_EDITOR_LABELS: LineItemEditorLabels = {
  description: 'Description', quantity: 'Qty', rate: 'Rate', vat: 'VAT', amount: 'Amount', remove: 'Remove', add: 'Add line',
  subtotal: 'Subtotal', discount: 'Discount', taxable: 'Taxable amount', exempt: 'Exempt amount', total: 'Total',
  incomplete: 'Not counted until the quantity and rate are complete', lines: 'Line items',
  amountsIn: (currency) => `Amounts in ${currency}`, added: (line) => `Line ${line} added.`, removed: (line) => `Line ${line} removed.`, totalNow: (total) => `Total ${total}.`, line: (line) => `line ${line}`,
};

export interface LineItemEditorProps {
  /** The lines being edited. Give each a stable id. */
  lines: readonly LineItemDraft[];
  /** Called with the next lines after every edit, add or remove. */
  onChange: (lines: LineItemDraft[]) => void;
  /** Makes a new empty line; it must have a fresh id. Default: an empty taxable line with a generated id. */
  newLine?: () => LineItemDraft;
  /** Currency of the rates and totals. Default NPR, en-IN grouping. */
  money?: MoneyFormatConfig;
  /** VAT rate as a decimal fraction. Default '0.13'. */
  vatRate?: string;
  /** Default 'half-up'. */
  rounding?: RoundingMode;
  /** A discount on the whole bill. */
  discount?: InvoiceDiscount;
  /** Most fraction digits in a quantity. Default 3 (grams of a kilogram). */
  quantityDigits?: number;
  /** Show the VAT checkbox on each line. Default true. With false every line is taxable. */
  showTaxable?: boolean;
  /** Most lines allowed; the Add button is disabled at the limit. */
  maxLines?: number;
  /** Called with the totals of the complete lines whenever they change. */
  onTotals?: (totals: InvoiceTotals | null, incomplete: string[]) => void;
  /** Words, in the reader's language. */
  labels?: Partial<LineItemEditorLabels>;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

const REMOVE_ICON = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" /></svg>;

let counter = 0;
const defaultNewLine = (): LineItemDraft => ({ id: `line-${Date.now().toString(36)}-${(counter++).toString(36)}`, description: '', quantity: '1', rate: '', taxable: true });

export function LineItemEditor({
  lines, onChange, newLine = defaultNewLine, money = nepalLedgerMoney, vatRate = '0.13', rounding = 'half-up', discount, quantityDigits = 3,
  showTaxable = true, maxLines, onTotals, labels, testId,
}: LineItemEditorProps) {
  const words = { ...DEFAULT_LINE_ITEM_EDITOR_LABELS, ...labels };
  const root = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');
  // The control to focus after the next render (a new line's description, or a neighbour after a removal).
  const focusTarget = useRef<string | null>(null);
  const exponent = currencyExponent(money.currency);
  const formatter = getMoneyFormatter({ ...money, display: 'code' });
  const converted = useMemo(() => lineItemsToInvoiceLines(lines, { exponent, quantityDigits }), [lines, exponent, quantityDigits]);
  const totals = useMemo(() => {
    try { return computeInvoice(converted.lines, { vatRate, rounding, ...(discount ? { discount } : {}) }); } catch { return null; }
  }, [converted, vatRate, rounding, discount]);
  useEffect(() => { onTotals?.(totals, converted.incomplete); }, [totals, converted, onTotals]);
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    const nodes = root.current?.querySelectorAll<HTMLElement>('[data-focus-key]') ?? [];
    for (const node of nodes) if (node.dataset.focusKey === target) { node.focus(); break; }
  });

  const update = (id: string, patch: Partial<LineItemDraft>) => onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  const totalText = totals ? formatter.format(totals.total) : '';
  const add = () => {
    const line = newLine();
    onChange([...lines, line]);
    focusTarget.current = `desc-${line.id}`;
    setAnnouncement(words.added(lines.length + 1));
  };
  const remove = (index: number) => {
    const next = lines.filter((_, i) => i !== index);
    onChange(next);
    const neighbour = next[index] ?? next[index - 1];
    focusTarget.current = neighbour ? `remove-${neighbour.id}` : 'add';
    setAnnouncement(words.removed(index + 1));
  };
  const amountOf = new Map(totals?.lines.map((line) => [line.id, line.net]) ?? []);
  const atLimit = maxLines !== undefined && lines.length >= maxLines;
  const sum = (value: bigint, id: string) => <MoneyDisplay value={value} preset={money} testId={testId ? `${testId}-${id}` : undefined} />;

  return (
    <div className="pu-lie" ref={root} data-testid={testId}>
      <div className="pu-lie-tablebox">
        <table className="pu-lie-table">
          <caption className="kit-sr">{words.lines}</caption>
          <thead>
            <tr>
              <th scope="col" className="pu-lie-desc">{words.description}</th>
              <th scope="col" className="pu-lie-qty num">{words.quantity}</th>
              <th scope="col" className="pu-lie-rate num">{words.rate}</th>
              {showTaxable && <th scope="col" className="pu-lie-vat">{words.vat}</th>}
              <th scope="col" className="num">{words.amount}</th>
              <th scope="col"><span className="kit-sr">{words.remove}</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const n = index + 1;
              const incomplete = converted.incomplete.includes(line.id);
              const net = amountOf.get(line.id);
              return (
                <tr key={line.id} data-incomplete={incomplete ? 'true' : undefined} data-testid={testId ? `${testId}-line-${index}` : undefined}>
                  <td className="pu-lie-desc">
                    <Field label={`${words.description}, ${words.line(n)}`} hideLabel size="md" value={line.description} onChange={(description) => update(line.id, { description })} data-focus-key={`desc-${line.id}`} testId={testId ? `${testId}-desc-${index}` : undefined} />
                  </td>
                  <td className="pu-lie-qty">
                    <Field label={`${words.quantity}, ${words.line(n)}`} hideLabel size="md" inputMode="decimal" autoComplete="off" value={line.quantity} onChange={(quantity) => update(line.id, { quantity })} testId={testId ? `${testId}-qty-${index}` : undefined} />
                  </td>
                  <td className="pu-lie-rate">
                    <CurrencyInput label={`${words.rate}, ${words.line(n)}`} hideLabel size="md" showCurrency={false} preset={money} value={line.rate} onValueChange={(change) => update(line.id, { rate: change.value })}
                      onBlur={() => { if (totalText) setAnnouncement(words.totalNow(totalText)); }} testId={testId ? `${testId}-rate-${index}` : undefined} />
                  </td>
                  {showTaxable && (
                    <td className="pu-lie-vat">
                      <input type="checkbox" className="pu-lie-check" checked={line.taxable !== false} onChange={(event) => update(line.id, { taxable: event.target.checked })}
                        aria-label={`${words.vat}, ${words.line(n)}`} data-testid={testId ? `${testId}-vat-${index}` : undefined} />
                    </td>
                  )}
                  <td className="num pu-lie-amount">
                    {net === undefined ? <span className="pu-lie-pending" title={words.incomplete}><span aria-hidden="true">—</span><span className="kit-sr">{words.incomplete}</span></span> : sum(net, `amount-${index}`)}
                  </td>
                  <td className="pu-lie-remove">
                    <Button variant="ghost" size="sm" iconOnly label={`${words.remove} ${words.line(n)}`} onClick={() => remove(index)} data-focus-key={`remove-${line.id}`} testId={testId ? `${testId}-remove-${index}` : undefined} icon={REMOVE_ICON} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pu-lie-foot">
        <div className="pu-lie-actions">
          <Button variant="secondary" size="sm" onClick={add} disabled={atLimit} data-focus-key="add" testId={testId ? `${testId}-add` : undefined}>{words.add}</Button>
          <p className="pu-lie-currency">{words.amountsIn(money.currency)}</p>
        </div>
        {totals && (
          <dl className="pu-lie-sum">
            <div><dt>{words.subtotal}</dt><dd>{sum(totals.subtotal, 'subtotal')}</dd></div>
            {totals.discount > 0n && <div><dt>{words.discount}</dt><dd>{sum(totals.discount, 'discount')}</dd></div>}
            <div><dt>{words.taxable}</dt><dd>{sum(totals.taxable, 'taxable')}</dd></div>
            {totals.exempt !== 0n && <div><dt>{words.exempt}</dt><dd>{sum(totals.exempt, 'exempt')}</dd></div>}
            <div><dt>{`${words.vat} ${ratePercent(vatRate)}%`}</dt><dd>{sum(totals.vat, 'vat')}</dd></div>
            <div className="pu-lie-total"><dt>{words.total}</dt><dd>{sum(totals.total, 'total')}</dd></div>
          </dl>
        )}
      </div>
      <p className="kit-sr" role="status" aria-live="polite" data-testid={testId ? `${testId}-status` : undefined}>{announcement}</p>
    </div>
  );
}
