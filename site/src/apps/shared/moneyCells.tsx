// Money cells for FinancialTable in the back-office apps: the amount is exact Money for subtotals and totals, and is
// drawn with MoneyDisplay (signed, no currency mark: the caption names the currency).
import type { ReactNode } from 'react';
import { MoneyDisplay } from '@punji/ui/money-display';
import { isMoney, money, type Money } from '@punji/ui/money';
import type { CellValue } from '@punji/ui/table-core';
import { npr } from './books.ts';

export const nprMoney = (minor: bigint): Money => money(minor, 'NPR');

/**
 * A signed amount: +226,000.00 in, -85,000.00 out. The sign is text, so it survives a black and white print. Pass
 * `plain` for a column that already says which way the money went (only a negative balance shows a sign).
 */
export function Amount({ value, plain, testId }: { value: bigint | null | undefined; plain?: boolean; testId?: string }) {
  return <MoneyDisplay value={value} preset={npr} display="none" signDisplay={plain ? 'negative' : 'exceptZero'} testId={testId} />;
}

/** `formatAggregate` for money columns: a subtotal, a total, or the expected value in a reconcile badge. */
export function formatMoneyAggregate(value: CellValue): ReactNode {
  return isMoney(value) ? <Amount value={value.minor} /> : null;
}

/** The same for a column that is already one-directional (money in, money out). */
export function formatPlainAggregate(value: CellValue): ReactNode {
  return isMoney(value) ? <Amount value={value.minor} plain /> : null;
}
