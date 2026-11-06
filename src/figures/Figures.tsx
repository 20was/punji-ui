'use client';

/**
 * Figure and Delta: every number on a kit page goes through one of these.
 * Tabular numerals, never truncated (a figure has its own element and
 * `white-space: nowrap`), en-IN grouping (lakh and crore). A change is sign +
 * arrow + colour + a spoken word, so colour never carries it alone. A move
 * that prints as 0.00% is no move: grey, no arrow (the app's changeV2).
 */
import { fixed, rs } from '../internal/number.ts';
import { useLocaleMessages } from '../locale/context.tsx';
import type { Money, MoneyFormatter } from '../money/money.ts';
import { formatFigure, isNum, rsMark, toneOf, type DeltaWords, type FigureKind } from '../format/format.ts';

const EN_WORDS: DeltaWords = { up: 'up', down: 'down', flat: 'unchanged' };

export interface FigureProps {
  /**
   * The number to print. null, undefined and NaN print a dash, never zero.
   * Pass a `Money` (from `money(minor, currency)`) for an exact, currency-aware amount: it is printed by
   * `formatter`, or by Intl `en` for its currency, and `kind` and `dp` are ignored.
   */
  value: number | Money | null | undefined;
  /**
   * How to print a number: int (whole), pct (percent) or num (plain, default).
   * @deprecated The `'rs'` value (rupees, en-IN, a float). Pass `value={money(minor, 'NPR')}` instead.
   */
  kind?: FigureKind;
  /** Money mode only: the formatter that prints a `Money` value (its currency must match). Default: Intl `en` for the currency. */
  formatter?: MoneyFormatter;
  /** Decimals to print (default 2). */
  dp?: number;
  /** The rupee mark for the deprecated `kind: 'rs'`. Default: "रु." under a Nepali `PunjiLocaleProvider`, else "Rs". */
  mark?: string;
  /** Becomes data-testid on the figure. */
  testId?: string;
}

/** The rupee mark the provider's locale asks for ("Rs" without a provider). */
function useRsMark(mark: string | undefined): string {
  const { locale } = useLocaleMessages();
  return mark ?? rsMark(locale);
}

const isMoney = (v: unknown): v is Money => typeof v === 'object' && v !== null && typeof (v as Money).minor === 'bigint';

// Without a formatter: exact, via Intl's decimal-string path (no Number), so this entry stays free of the money module's weight.
function printMoney(value: Money, formatter: MoneyFormatter | undefined, absolute = false): string {
  const minor = absolute && value.minor < 0n ? -value.minor : value.minor;
  if (formatter) {
    if (formatter.currency !== value.currency.toUpperCase()) throw new TypeError(`Formatter is ${formatter.currency} but the amount is ${value.currency}`);
    return formatter.format(minor);
  }
  const intl = new Intl.NumberFormat('en', { style: 'currency', currency: value.currency.toUpperCase() });
  const exponent = intl.resolvedOptions().maximumFractionDigits ?? 2;
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(exponent + 1, '0');
  const decimal = exponent ? `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}` : digits;
  return intl.format(`${negative ? '-' : ''}${decimal}` as `${number}`);
}

/**
 * @stability stable
 */
export function Figure({ value, kind = 'num', dp = 2, formatter, mark, testId }: FigureProps) {
  const rupee = useRsMark(mark);
  if (isMoney(value)) return <span className="kit-fig" data-testid={testId}>{printMoney(value, formatter)}</span>;
  return <span className="kit-fig" data-testid={testId}>{formatFigure(value, kind, dp, rupee)}</span>;
}

export interface DeltaProps {
  /** The change to print, signed. null, undefined and NaN print a dash. A value that rounds to zero at `dp` is neutral. A `Money` value prints exactly through `formatter` (`kind` and `dp` are ignored; zero is neutral). */
  value: number | Money | null | undefined;
  /**
   * pct (default): 1.25%. num: a plain number.
   * @deprecated The `'rs'` value (rupees, en-IN, a float). Pass `value={money(minor, 'NPR')}` instead.
   */
  kind?: 'pct' | 'rs' | 'num';
  /** Money mode only: the formatter that prints the amount. Default: Intl `en` for the currency. */
  formatter?: MoneyFormatter;
  /** Decimals to print (default 2). */
  dp?: number;
  /** The rupee mark for the deprecated `kind: 'rs'`. Default: "रु." under a Nepali `PunjiLocaleProvider`, else "Rs". */
  mark?: string;
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
  formatter,
  mark,
  testId,
}: DeltaProps) {
  const rupee = useRsMark(mark);
  if (isMoney(value)) {
    const tone = value.minor > 0n ? 'up' : value.minor < 0n ? 'down' : 'flat';
    const text = printMoney(value, formatter, true);
    return <DeltaBody tone={tone} arrow={arrow} words={words} size={size} testId={testId} body={text} />;
  }
  if (!isNum(value)) return <span className="kit-fig kit-flat" data-testid={testId}>-</span>;
  const tone = toneOf(value, dp);
  const abs = Math.abs(value);
  const body = kind === 'rs' ? rs(abs, rupee) : kind === 'pct' ? `${fixed(abs, dp)}%` : fixed(abs, dp);
  return <DeltaBody tone={tone} arrow={arrow} words={words} size={size} testId={testId} body={body} />;
}

function DeltaBody({ tone, arrow, words, size, testId, body }: { tone: 'up' | 'down' | 'flat'; arrow: boolean; words: DeltaWords; size: 'sm' | undefined; testId: string | undefined; body: string }) {
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
