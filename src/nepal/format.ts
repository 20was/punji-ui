import { NEPAL_TIME_ZONE, type NepalLanguage, type NepalNumberOptions } from './locale.ts';
export * from './locale.ts';
/** Western digits remain the default in both languages; opt in to Devanagari. */
export function formatNepalNumber(value: number | bigint | null | undefined, options: NepalNumberOptions = {}): string {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return options.missing ?? '—';
  const dp = options.fractionDigits ?? 2;
  if (!Number.isInteger(dp) || dp < 0 || dp > 20) throw new RangeError('fractionDigits must be an integer from 0 to 20');
  return new Intl.NumberFormat('en-IN', {
    numberingSystem: options.digits ?? 'latn', minimumFractionDigits: dp, maximumFractionDigits: dp,
  }).format(Object.is(value, -0) ? 0 : value);
}
export function formatNPR(value: number | bigint | null | undefined, options: NepalNumberOptions = {}): string {
  const number = formatNepalNumber(value, options);
  return value == null || (typeof value === 'number' && !Number.isFinite(value)) ? number : `${options.language === 'ne' ? 'रु' : 'NPR'} ${number}`;
}
/** Percent input is percentage points: 5 means 5%, not 500%. */
export function formatPercent(value: number | null | undefined, options: NepalNumberOptions = {}): string {
  const number = formatNepalNumber(value, options);
  return value == null || !Number.isFinite(value) ? number : `${number}%`;
}
/** An instant is explicit (Date or epoch milliseconds); date-only strings are never parsed as instants. */
export function formatNepalDate(value: Date | number, options: { language?: NepalLanguage; digits?: 'latn' | 'deva'; timeZone?: string; includeTime?: boolean } = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid instant');
  return new Intl.DateTimeFormat(options.language === 'ne' ? 'ne-NP' : 'en-GB', {
    calendar: 'gregory', numberingSystem: options.digits ?? 'latn', timeZone: options.timeZone ?? NEPAL_TIME_ZONE,
    year: 'numeric', month: 'short', day: 'numeric', ...(options.includeTime ? { hour: '2-digit', minute: '2-digit' } as const : {}),
  }).format(date);
}
