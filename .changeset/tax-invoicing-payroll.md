---
'@punji/ui': minor
---

Tax, invoicing and payroll. Components: `TaxInvoice` (printable VAT bill with seller and buyer PAN, BS and AD dates, exact VAT and the amount in words), `LineItemEditor` (editable bill lines with exact totals), `PanInput` (nine-digit PAN/VAT field with Devanagari digits; forwards `ref`), `IncomeTaxCalculator` and `IncomeTaxBreakdown` (slabs passed as data, single or couple, SSF/CIT/PF deductions), `Payslip`, `AgingTable` (0–30, 31–60, 61–90, 90+) and `TdsSummary`. The pure `@punji/ui/tax` module: `amountInWords` and `integerInWords` (lakh/crore, English and Nepali), `checkPan` (the one PAN rule; `validatePan` in `@punji/ui/kyc` uses it), `computeInvoice`, `computeIncomeTax`, `taxableIncome`, `ageItems`, `summariseTds`, `tdsToCsv` and `payslipTotals`. All money is bigint minor units with an explicit rounding mode; no tax tables are shipped. Styles in `css/tax.css`; see docs/TAX.md.
