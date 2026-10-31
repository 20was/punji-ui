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

export function Figure({ value, kind = 'num', dp = 2, testId }: { value: number | null | undefined; kind?: FigureKind; dp?: number; testId?: string }) {
  return <span className="kit-fig" data-testid={testId}>{formatFigure(value, kind, dp)}</span>;
}

export function Delta({
  value,
  kind = 'pct',
  dp = 2,
  arrow = true,
  words = EN_WORDS,
  size,
  testId,
}: {
  value: number | null | undefined;
  kind?: 'pct' | 'rs' | 'num';
  dp?: number;
  arrow?: boolean;
  words?: DeltaWords;
  /** sm: the 12px line under a price in a table row. */
  size?: 'sm';
  testId?: string;
}) {
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
