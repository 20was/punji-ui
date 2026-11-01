// Pure tax, invoicing and payroll helpers behind one subpath: amount in words, PAN check, invoice and VAT totals,
// income tax from slabs, receivables aging, TDS and payslip totals. No React, no browser globals, no tax tables.
export * from './words.ts';
export * from './pan.ts';
export * from './invoice.ts';
export * from './income-tax.ts';
export * from './aging.ts';
export * from './tds.ts';
export * from './payroll.ts';
