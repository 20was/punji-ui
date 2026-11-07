/** Pure helpers behind the kit (formatting, parsing, search); no React. */
import { cr as crOf, fixed, int, rs as rsOf } from '../internal/number.ts';
import { toAsciiDigits } from '../nepal/decimal.ts';

export const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** `'rs'` is rupee-only and en-IN fixed; for money pass a `Money` value (see `Figure`) so the currency and formatter are explicit. */
export type FigureKind = 'rs' | 'int' | 'pct' | 'num';

/**
 * `mark` is the rupee prefix for `kind: 'rs'` ("Rs" by default; `rsMark('ne')` gives "रु.").
 */
export function formatFigure(value: number | null | undefined, kind: FigureKind = 'num', dp = 2, mark = 'Rs'): string {
  if (!isNum(value)) return '-';
  switch (kind) {
    case 'rs':
      return rsOf(value, mark);
    case 'int':
      return int(value);
    case 'pct':
      return `${fixed(value, dp)}%`;
    default:
      return fixed(value, dp);
  }
}

/** The reader's language for the rupee formatters. Only `ne` differs; every other value reads English. */
export type ReaderLang = 'en' | 'ne';

let reader: ReaderLang = 'en';

/**
 * Sets the language the plain formatters (`rs`, `cr`, `rsMark`, `unitWords`) use when they are not handed one. A shim for
 * code that formats outside React (a migration from a module-global setter); in components prefer `PunjiLocaleProvider`,
 * which `Figure`, `Delta` and the charts read, or pass the language to the formatter. It is process-wide: on a server
 * shared between requests, pass the language explicitly instead of calling this. Default 'en'.
 */
export function setReaderLang(lang: ReaderLang | string): void {
  reader = readerLangOf(lang);
}

/** The language `setReaderLang` last set ('en' until then). */
export const readerLang = (): ReaderLang => reader;

/** A locale tag as a reader language: 'ne', 'ne-NP' and 'NE' are 'ne'; anything else is 'en'. */
export function readerLangOf(locale: string | null | undefined): ReaderLang {
  return typeof locale === 'string' && /^ne(?:[-_]|$)/i.test(locale.trim()) ? 'ne' : 'en';
}

/** The rupee mark: "Rs" in English, "रु." in Nepali. With no argument, the language `setReaderLang` set. */
export const rsMark = (lang: ReaderLang | string = reader): string => (readerLangOf(lang) === 'ne' ? 'रु.' : 'Rs');

/** The compact amount words for `compactRs`: L, Cr, Arba / लाख, करोड, अर्ब. */
export function unitWords(lang: ReaderLang | string = reader): { lakh: string; crore: string; arba: string } {
  return readerLangOf(lang) === 'ne' ? { lakh: 'लाख', crore: 'करोड', arba: 'अर्ब' } : { lakh: 'L', crore: 'Cr', arba: 'Arba' };
}

/** A rupee amount with two decimals and the language's mark: `Rs 8,42,610.00` / `रु. 8,42,610.00` (Western digits in both). A missing value prints '-'. */
export const rs = (n: number | null | undefined, lang: ReaderLang | string = reader): string => rsOf(n, rsMark(lang));

/** An amount already in crore: `Rs 4.20 crore` / `रु. 4.20 करोड`. A missing value prints '-'. */
export const cr = (n: number | null | undefined, lang: ReaderLang | string = reader): string => crOf(n, rsMark(lang), readerLangOf(lang) === 'ne' ? 'करोड' : 'crore');

export interface DeltaWords {
  up: string;
  down: string;
  flat: string;
}


/** Tone of a change after rounding to what is printed. */
/** A company's name without its legal tail ("Chilime Hydropower Company Limited" → "Chilime Hydropower"), as stock rows print it. */
// One whitespace char, then trim: same result as the kit's \s+ (the trim takes the rest of a run), without the quadratic backtracking \s+ has on a long run of spaces.
export function shortCompanyName(name: string): string {
  return name.replace(/\s(company limited|co\.?,? ltd\.?|limited|ltd\.?)$/i, '').trim();
}

/** Short words a registered name keeps in capitals (NEPSE's own spellings: NIC Asia, NMB, Global IME, API Power). */
const NAME_ACRONYMS = new Set(['NIC', 'NMB', 'IME', 'API', 'NCC', 'SBI', 'NLG', 'CEDB', 'RBB', 'NRN', 'NEPSE', 'NIDC', 'NEA', 'IHL', 'UNL', 'HRL', 'NTC', 'NHPC', 'CIT', 'ICFC', 'GBIME', 'ADBL', 'HIDCL']);
const NAME_SMALL = new Set(['and', 'of', 'the', 'for', 'in', 'at', 'on', 'to']);

/**
 * A registered company name as a row prints it: an all-capitals name ("NEPAL LIFE INSURANCE COMPANY LIMITED") in
 * normal case ("Nepal Life Insurance Company Limited"), keeping known acronyms (NIC, NMB, IME, API ...) and "and",
 * "of" small. A name already in mixed case is returned as written. Compose with `shortCompanyName` where a row is
 * narrow: `shortCompanyName(displayCompanyName(name))`.
 */
export function displayCompanyName(name: string): string {
  const s = name.trim();
  if (!/[A-Z]/.test(s) || /[a-z]/.test(s)) return s;
  return s
    .split(/(\s+|-|\/|\(|\))/)
    .map((w, i) => {
      if (!/[A-Z]/.test(w)) return w;
      if (NAME_ACRONYMS.has(w.replace(/[.,&]/g, ''))) return w;
      const lower = w.toLowerCase();
      return i > 0 && NAME_SMALL.has(lower) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
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
