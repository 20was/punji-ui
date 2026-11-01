/** Pure helpers behind the kit (formatting, parsing, search); no React. */
import { fixed, int, rs } from '../internal/number.ts';
import { toAsciiDigits } from '../nepal/decimal.ts';

export const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export type FigureKind = 'rs' | 'int' | 'pct' | 'num';

export function formatFigure(value: number | null | undefined, kind: FigureKind = 'num', dp = 2): string {
  if (!isNum(value)) return '-';
  switch (kind) {
    case 'rs':
      return rs(value);
    case 'int':
      return int(value);
    case 'pct':
      return `${fixed(value, dp)}%`;
    default:
      return fixed(value, dp);
  }
}

export interface DeltaWords {
  up: string;
  down: string;
  flat: string;
}


/** Tone of a change after rounding to what is printed. */
/** A company's name without its legal tail ("Chilime Hydropower Company Limited" → "Chilime Hydropower"), as stock rows print it. */
export function shortCompanyName(name: string): string {
  return name.replace(/\s(company limited|co\.?,? ltd\.?|limited|ltd\.?)$/i, '').trim();
}

export function toneOf(value: number | null | undefined, dp = 2): 'up' | 'down' | 'flat' {
  if (!isNum(value)) return 'flat';
  const r = Number(value.toFixed(dp));
  return r > 0 ? 'up' : r < 0 ? 'down' : 'flat';
}

/** A typed number: grouping commas, spaces and Devanagari, Bengali, Arabic-Indic, Thai (any `DIGIT_SCRIPTS`) digits accepted. NaN when empty or invalid. */
export function parseNumber(v: string): number {
  const s = toAsciiDigits(v.replace(/[,\s]/g, ''));
  // One linear pattern (no nested or adjacent repeats), and a length cap first: a typed number never needs more.
  if (s.length > 64 || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return Number.NaN;
  return Number.parseFloat(s);
}

export interface SymbolOption {
  symbol: string;
  name: string;
}

/** Ranks: exact symbol, symbol prefix, name word prefix, symbol contains. */
export function searchSymbols(all: readonly SymbolOption[], query: string, limit = 8): SymbolOption[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const scored: [number, SymbolOption][] = [];
  for (const o of all) {
    const s = o.symbol.toUpperCase();
    const n = o.name.toUpperCase();
    let score = -1;
    if (s === q) score = 0;
    else if (s.startsWith(q)) score = 1;
    else if (n.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (s.includes(q)) score = 3;
    if (score >= 0) scored.push([score, o]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].symbol.localeCompare(b[1].symbol));
  return scored.slice(0, limit).map(([, o]) => o);
}

/** Where an arrow, Home or End key moves the selection (pure, for the tests). */
export function segmentTarget<T extends string>(values: readonly T[], current: T, key: string): T | null {
  const i = values.indexOf(current);
  const n = values.length;
  if (n === 0) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return values[(i + 1 + n) % n] ?? null;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return values[(i - 1 + n) % n] ?? null;
  if (key === 'Home') return values[0] ?? null;
  if (key === 'End') return values[n - 1] ?? null;
  return null;
}
