# Tax, invoicing and payroll

Seven components and a pure module for the screens of billing, POS, payroll and tax software: `TaxInvoice`,
`LineItemEditor`, `PanInput`, `IncomeTaxCalculator` (with `IncomeTaxBreakdown`), `Payslip`, `AgingTable` and
`TdsSummary`, with `@punji/ui/tax` (`computeInvoice`, `amountInWords`, `checkPan`, `computeIncomeTax`,
`taxableIncome`, `ageItems`, `summariseTds`, `tdsToCsv`, `payslipTotals`, ...). Each component has a subpath
(`@punji/ui/tax-invoice`, ...); all styles are in `@punji/ui/css/tax.css` (and `styles.css`).

**What this is not.** These are display components and exact arithmetic. They are not a billing system, a payroll
engine or tax advice. **The package ships no tax table**: VAT rates, income-tax slabs, deduction caps, rebates and
TDS rates are props and arguments, because each budget changes them. The VAT rate defaults to `'0.13'` only because
that is Nepal's standard rate at the time of writing; pass the rate in force on the invoice date. A browser can be
edited by anyone: **the server that issues the bill, runs payroll or files the return must compute every figure
again** and validate every amount, PAN and invoice number.

**Numeric contract** (see [FINANCIAL.md](FINANCIAL.md) and [ACCOUNTING.md](ACCOUNTING.md)). Every amount is a
`bigint` in minor units (paisa). Rates are exact decimal-fraction strings (`'0.13'`, `'0.015'`) parsed without
`Number`. Every step that can leave a fraction takes a `RoundingMode` (`half-up`, `half-even`, `floor`, `ceil`,
`trunc`): the pure functions require it, the components default to `half-up`. Invalid input throws (`TypeError` for
a wrong type or malformed rate, `RangeError` for a negative or impossible amount) and the components show an alert
instead of a number. The only floating-point value is the display-only effective tax rate.

Money and locale: components take `money` (a `MoneyFormatConfig`), defaulting to NPR with `en-IN` lakh/crore grouping
and no currency mark (the currency is named once in a caption or note).

## Pure helpers (`@punji/ui/tax`)

No React, no browser globals (enforced by `scripts/check-boundaries.mjs`); it may import only the rounding helpers,
the date-only type, minor-unit helpers and the CSV writer.

### Amount in words

```ts
amountInWords(16231320n);
// 'Rupees One Lakh Sixty-Two Thousand Three Hundred Thirteen and Twenty Paisa Only'
amountInWords(150050n, { language: 'ne' });  // 'एक हजार पाँच सय रुपैयाँ पचास पैसा मात्र'
integerInWords(1_01_01_01_101n);             // 'one arab one crore one lakh one thousand one hundred one'
```

South Asian scales: hundred, thousand, lakh, crore, arab, kharab (past 99 kharab it reads "120 kharab"). Options:
`language` (`en`, `ne`), `scale` (minor digits, default 2), `major`, `minor`, `suffix`, `unitPosition`, `case`
(`title`, `sentence`, `lower`), `numberWords` (your own 100 words for 0 to 99; Nepali spellings vary) and
`scaleWords`. Zero paisa is left out; a negative amount starts with "minus" (`ऋण`).

### PAN and VAT numbers

`checkPan(input)` returns `{ state: 'empty' | 'partial' | 'valid' | 'invalid', value, reason? }` after converting
Devanagari digits and removing spaces, hyphens and dots. Nine digits is `valid`. There is no published checksum, so
this checks the shape only; whether the number was issued (and is VAT-registered) is a lookup with the Inland Revenue
Department. `isValidPan`, `normalizePan`, `formatPanNumber(value, { digits: 'deva' })`.

### Invoice and VAT

```ts
const totals = computeInvoice(lines, { vatRate: '0.13', rounding: 'half-up', discount: { rate: '0.05' } });
// { lines, subtotal, lineDiscount, invoiceDiscount, discount, taxable, exempt, vat, total }
```

- A line is `{ id, quantity: bigint | '2.5', rate, discount?, taxable? }`. A decimal quantity is applied exactly and
  rounded once per line.
- `discount` on the invoice is `{ amount }` or `{ rate }`, applied after line discounts and shared between taxable and
  exempt lines in proportion; the exempt share is the remainder, so the parts always sum exactly.
- VAT is charged on `taxable` and rounded once. `total = taxable + exempt + vat` and
  `taxable + exempt = subtotal - discount` hold for every input (fast-check property in `test/tax.test.ts`).
- `ratePercent('0.13')` is `'13'` for display.

### Income tax

Slabs are data: `{ width: bigint | null, rate, label?, waivable? }`, each band's width ("the next 2 lakh"), the last
open (`null`). `computeIncomeTax(taxable, slabs, { rounding, waive?, rebates? })` returns each band's taxed part and
tax (rounded per band; the total is their exact sum), rebates, the tax, income after tax, the marginal rate and a
display effective rate. `waive` drops bands marked `waivable` (for example the 1% social security tax for a Social
Security Fund contributor).

`taxableIncome({ income, retirement, retirementRule, deductions, rounding })` limits retirement contributions
(SSF, CIT, PF, approved funds) together by the lowest of what was paid, `retirementRule.cap` and
`retirementRule.fraction` of income (`{ numerator: 1n, denominator: 3n }`), and each other deduction by its own cap.

**Example table, not current law.** The slabs below have the shape of Nepal's FY 2081/82 resident-individual table
and are used in the docs and tests to show the data. Check the Finance Act for the year you display, and label it.

| Single (taxable income) | Rate | Couple (taxable income) | Rate |
| --- | --- | --- | --- |
| First 5,00,000 | 1% (waivable) | First 6,00,000 | 1% (waivable) |
| Next 2,00,000 | 10% | Next 2,00,000 | 10% |
| Next 3,00,000 | 20% | Next 3,00,000 | 20% |
| Next 10,00,000 | 30% | Next 9,00,000 | 30% |
| Next 30,00,000 | 36% | Next 30,00,000 | 36% |
| Above 50,00,000 | 39% | Above 50,00,000 | 39% |

```ts
const LAKH = 10_000_000n; // in paisa
const single: TaxSlab[] = [
  { width: 5n * LAKH, rate: '0.01', label: 'Social security tax', waivable: true },
  { width: 2n * LAKH, rate: '0.1' }, { width: 3n * LAKH, rate: '0.2' }, { width: 10n * LAKH, rate: '0.3' },
  { width: 30n * LAKH, rate: '0.36' }, { width: null, rate: '0.39' },
];
computeIncomeTax(12n * LAKH, single, { rounding: 'half-up' }).tax; // 14_500_000n (Rs 1,45,000)
```

### Aging, TDS, payslips

- `ageItems(items, asOf, { limits = [30, 60, 90], notDue = true })` groups `{ id, party, date, amount }` into
  not-due, 0–30, 31–60, 61–90 and 90+ by whole days between date-only values (`calendarDaysBetween`). Rows keep first-seen
  order; every row and column sums exactly.
- `summariseTds(entries, { rounding })` withholds `gross × rate` per entry (or the `withheld` you pass), and totals by
  category (`rate` is null when a category mixes rates). `tdsToCsv(entries, { rounding })` writes exact,
  formula-safe CSV through `toCsv` (see [EXPORT.md](EXPORT.md)).
- `payslipTotals(earnings, deductions)` gives `{ gross, deductions, net }`; net may be negative.

## TaxInvoice

A printable VAT invoice: seller (logo, address, contact, PAN/VAT), buyer and PAN, invoice number, date in BS and AD,
due date, payment mode, lines (serial, particulars with detail and exempt mark, optional code column, quantity and
unit, rate, amount), subtotal, discount, taxable, exempt, `VAT 13%`, total, the total in words, notes and a signature
line. Props: `seller`, `buyer`, `invoiceNumber`, `date`, `dueDate`, `paymentMode`, `lines`, `discount`, `vatRate`,
`rounding`, `money`, `currencyNote`, `words` (options or `false`), `language` and `digits` (BS date), `copyMark`,
`notes`, `logo`, `showCode`, `signature`, `printable`, `onTotals`, `labels`, `headingLevel`. Print styles remove tint
and buttons and keep rows whole. BS dates use the converter (1975 to 2099 BS); outside that range only AD prints.

## LineItemEditor

Controlled editable lines (`LineItemDraft`: `id`, `description`, `quantity` as typed, `rate` as an ASCII decimal,
`taxable`). Totals update as you type; an unfinished line is marked and excluded rather than counted as zero.
`lineItemsToInvoiceLines(drafts, { exponent, quantityDigits })` converts to exact invoice lines and lists the
incomplete ids. Add line focuses the new description; Remove moves focus to the next line or to Add line; both are
announced, and the total is announced when a rate field is left. Props: `lines`, `onChange`, `newLine`, `money`,
`vatRate`, `rounding`, `discount`, `quantityDigits`, `showTaxable`, `maxLines`, `onTotals`, `labels`.

## PanInput

A text field: Devanagari digits and pasted separators accepted, ASCII digits reported through `onValueChange` with
the `checkPan` state; messages ("Enter all 9 digits", "Use digits only") appear after the field is left. `digits="deva"`
shows Devanagari; `error` takes your lookup result; `labels` translates.

## IncomeTaxCalculator and IncomeTaxBreakdown

Income, status (single or couple), SSF checkbox (shown when a slab is `waivable`), retirement contributions (default
SSF, CIT, PF), other capped `deductions`, tickable `rebates`; out come tax for the year and per month, deductions,
taxable income, effective rate, income after tax and the band table. Uncontrolled with `defaultValues`; `onResult`
reports every change. The result is announced politely when a field is left. `IncomeTaxBreakdown` is the band table
alone (`result`, `caption`, `hideEmpty`).

## Payslip

Employer and employee (name, `detail`, PAN, `facts`), `period`, `payDate`, `earnings` and `deductions` as two
tables, gross, total deductions, net (red with its sign when negative) and the net in words. Print styles as the
invoice. Mask bank accounts yourself before passing them.

## AgingTable

Parties by bucket with a totals row and a share row; the not-due column appears when any item is not yet due
(`notDue: 'auto'`). The oldest bucket is bold. `limits`, `bucketLabel`, `renderParty`, `showShare`, and the usual
`state`, `emptyLabel`, `onRetry`. Stacks into labelled cards under 640px.

## TdsSummary

`view="category"` (default): category, rate or "Mixed", number of payments, gross and TDS, with totals.
`view="entries"`: payee, PAN, category, gross, rate, TDS and net. `rounding`, `money`, `labels` and states.

## Testing

`test/tax.test.ts` has fast-check properties (invoice identities for any lines, discount and rounding mode; income
tax bands cover the income and tax never falls as income rises; aging rows and columns sum to the grand total;
words are distinct for distinct amounts) and worked cases. `test/tax-components.test.tsx` covers each component's
behaviour, focus, announcements and axe. Visual fixtures are in `test/visual/fixtures-tax.tsx`.
