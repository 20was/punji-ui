// Exact loan and deposit maths (EMI, amortisation, prepayment, fixed and recurring deposits with TDS). Pure: no React, no browser globals.
export { parsePercentRate, type PercentRate } from './rate.ts';
export * from './loan.ts';
export * from './deposit.ts';
