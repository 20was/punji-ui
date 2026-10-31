/**
 * Figure and Delta: every number on a kit page goes through one of these.
 * Tabular numerals, never truncated (a figure has its own element and
 * `white-space: nowrap`), en-IN grouping (lakh and crore). A change is sign +
 * arrow + colour + a spoken word, so colour never carries it alone. A move
 * that prints as 0.00% is no move: grey, no arrow (the app's changeV2).
 */
import { fixed, rs } from '../internal/number.ts';
import { formatFigure, isNum, toneOf, type DeltaWords, type FigureKind } from '../format/format.ts';

const EN_WORDS: DeltaWords = { up: 'up', down: 'down', flat: 'unchanged' };

export interface FigureProps {
  /** The number to print. null, undefined and NaN print a dash, never zero. */
  value: number | null | undefined;
  /** How to print it: rs (rupees with en-IN grouping), int (whole), pct (percent) or num (plain, default). */
  kind?: FigureKind;
  /** Decimals to print (default 2). */
  dp?: number;
  /** Becomes data-testid on the figure. */
  testId?: string;
}

export function Figure({ value, kind = 'num', dp = 2, testId }: FigureProps) {
  return <span className="kit-fig" data-testid={testId}>{formatFigure(value, kind, dp)}</span>;
}

export interface DeltaProps {
  /** The change to print, signed. null, undefined and NaN print a dash. A value that rounds to zero at `dp` is neutral. */
  value: number | null | undefined;
  /** pct (default): 1.25%. rs: rupees. num: a plain number. */
  kind?: 'pct' | 'rs' | 'num';
  /** Decimals to print (default 2). */
  dp?: number;
  /** Show the up or down arrow (default true). Sign, colour and the spoken word remain. */
  arrow?: boolean;
  /** The spoken words for up, down and unchanged, in the reader's language. Default English. */
  words?: DeltaWords;
  /** sm: the 12px line under a price in a table row. */
  size?: 'sm';
  /** Becomes data-testid on the figure. */
  testId?: string;
}

export function Delta({
  value,
  kind = 'pct',
  dp = 2,
  arrow = true,
  words = EN_WORDS,
  size,
  testId,
}: DeltaProps) {
  if (!isNum(value)) return <span className="kit-fig kit-flat" data-testid={testId}>-</span>;
  const tone = toneOf(value, dp);
  const abs = Math.abs(value);
  const body = kind === 'rs' ? rs(abs) : kind === 'pct' ? `${fixed(abs, dp)}%` : fixed(abs, dp);
  const sign = tone === 'up' ? '+' : tone === 'down' ? '−' : '';
  return (
    <span className={`kit-fig ${tone === 'up' ? 'kit-up' : tone === 'down' ? 'kit-dn' : 'kit-flat'}${size === 'sm' ? ' sm' : ''}`} data-testid={testId}>
      {arrow && tone !== 'flat' && <span aria-hidden="true">{tone === 'up' ? '▲ ' : '▼ '}</span>}
      {sign}
      {body}
      <span className="kit-sr">{` ${words[tone]}`}</span>
    </span>
  );
}
