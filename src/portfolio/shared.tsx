import type { ReactNode } from 'react';

import { PriceChange, type PriceChangeLabels } from '../price-change/PriceChange.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';

/** A missing figure: a dash for the eye and "No value" for the ear, never zero. */
export function Missing({ label = 'No value' }: { label?: string }): ReactNode {
  return <span className="pu-money pu-money-missing"><span aria-hidden="true">—</span><span className="kit-sr">{label}</span></span>;
}

/** A percent (5 means 5%) with fixed fraction digits in the money config's locale; null when there is no figure. */
export function percentText(value: number | null | undefined, money: MoneyFormatConfig, digits = 2): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(money.locale ?? 'en', {
    style: 'unit', unit: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits,
    ...(money.numberingSystem ? { numberingSystem: money.numberingSystem } : {}),
  }).format(value);
}

/** A signed amount with its percent as PriceChange, or a missing mark when there is no amount. */
export function ChangeFigure({ absolute, percent, money, convention, labels, size = 'sm', showPercent = true }: {
  absolute: bigint | null; percent: number | null; money: MoneyFormatConfig; convention?: 'green-up' | 'red-up'; labels?: PriceChangeLabels; size?: 'sm' | 'md'; showPercent?: boolean;
}): ReactNode {
  if (absolute === null) return <Missing />;
  return <PriceChange change={{ absolute, percent }} preset={money} {...(size === 'sm' ? { size } : {})} showPercent={showPercent} {...(convention ? { convention } : {})} {...(labels ? { labels } : {})} />;
}
