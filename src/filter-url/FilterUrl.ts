/**
 * Filter URL state (design.punji.app/components/filter-url): a typed schema of filters (a range, a multi-select, a
 * yes/no) and a pure, router-agnostic codec between filter values and a query string. Nothing here reads
 * `window` or imports a router, so it runs on the server, in a worker and in a test.
 *
 * Grammar, one query parameter per filter, named by the schema key:
 *
 *   pe=..12            a range, `min..max`; either end may be empty; a negative end keeps its minus (`-5..-1`)
 *   sector=banks,hydro a multi-select; each value is percent-encoded on its own, so a comma inside one is safe
 *   breakout=1         a yes/no filter; on only (an off filter is not in the address)
 *
 * Range ends are exact decimal strings and never pass through `Number`: `0.1` stays `0.1`, `1e3` and `0x10` are
 * not numbers here, and a price with more fraction digits than the schema allows is dropped, not rounded.
 * Order is stable: parameters are written by key, alphabetically, whatever order the schema was declared in, so one
 * state is one link. Decoding never throws: an unknown key is ignored, a mangled value skipped, a duplicate key
 * (the last wins) read once, a range with an end that is not an exact decimal is skipped whole, and the result is normalised, so `searchParamsToFilters(schema,
 * filtersToSearchParams(schema, v))` equals `normalizeFilters(schema, v)` and a second round trip changes nothing.
 */
import { compareDecimals, toAsciiDigits } from '../nepal/decimal.ts';

/** A range filter: exact decimal strings, `undefined` for no limit on that side. */
export interface RangeFilterValue {
  /** The lower end, a plain decimal string ('0', '-2.5'). */
  min?: string | undefined;
  /** The upper end, a plain decimal string. */
  max?: string | undefined;
}

export interface RangeFilterSchema {
  /** A range between two exact decimals. */
  kind: 'range';
  /** The most fraction digits an end may carry (0 to 9, default 4). A longer end is dropped. */
  fractionDigits?: number;
  /** Lower clamp, a plain decimal string: an end below it is raised to it. */
  min?: string;
  /** Upper clamp, a plain decimal string: an end above it is lowered to it. */
  max?: string;
}

export interface MultiFilterSchema {
  /** Several values from a list. */
  kind: 'multi';
  /** The allowed values, in display order. Others are dropped, and the order here is the order written. Omit to accept any. */
  options?: readonly string[];
  /** The most values kept (default 64). */
  maxItems?: number;
}

export interface BooleanFilterSchema {
  /** A yes/no filter. */
  kind: 'boolean';
}

export type FilterFieldSchema = RangeFilterSchema | MultiFilterSchema | BooleanFilterSchema;
/** Filter key to its kind. A key is the query parameter's name: letters, digits, `_`, `-`, `.`. */
export type FilterSchema = Readonly<Record<string, FilterFieldSchema>>;

/** The value type of one schema entry. */
export type FilterFieldValue<F extends FilterFieldSchema> = F extends RangeFilterSchema ? RangeFilterValue : F extends MultiFilterSchema ? readonly string[] : boolean;
/** The filters that are set; an absent key is not set. */
export type FilterValues<S extends FilterSchema = FilterSchema> = { [K in keyof S]?: FilterFieldValue<S[K]> };

/** What the parsers accept as a query: a `URLSearchParams`, a query string (with or without `?`) or a router's plain object. */
export type SearchParamsInput = URLSearchParams | string | Readonly<Record<string, string | readonly string[] | undefined>> | null | undefined;

const KEY = /^[A-Za-z0-9_.-]+$/;
const MAX_VALUE = 120;
const MAX_ITEMS = 64;

/** Reads any query input as a new `URLSearchParams`.
 *
 * @stability beta
 */
export function toSearchParams(input: SearchParamsInput): URLSearchParams {
  if (input == null) return new URLSearchParams();
  if (typeof input === 'string') return new URLSearchParams(input.startsWith('?') ? input.slice(1) : input);
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (typeof v === 'string') out.append(k, v);
    else for (const item of v) out.append(k, item);
  }
  return out;
}

const digitsOf = (schema: RangeFilterSchema) => {
  const d = schema.fractionDigits ?? 4;
  if (!Number.isInteger(d) || d < 0 || d > 9) throw new RangeError('fractionDigits must be an integer from 0 to 9');
  return d;
};

/**
 * A plain decimal in canonical form, or `null` when the text is not one: '007.50' is '7.5', '-0' is '0', '१२' is
 * '12'. No exponent, no grouping, no sign but a leading minus, no more than `fractionDigits` fraction digits once
 * trailing zeros are dropped. Never uses `Number`.
 *
 * @stability beta
 */
export function normalizeDecimal(text: string, fractionDigits = 4): string | null {
  if (text.length > MAX_VALUE) return null;
  const m = /^(-?)(\d{1,30})(?:\.(\d{1,30}))?$/.exec(toAsciiDigits(text.trim()).replace(/−/g, '-'));
  if (!m) return null;
  const frac = (m[3] ?? '').replace(/0+$/, '');
  if (frac.length > fractionDigits) return null;
  const whole = (m[2] ?? '0').replace(/^0+(?=\d)/, '');
  const zero = whole === '0' && frac === '';
  return `${m[1] && !zero ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

function clampDecimal(value: string, lo: string | undefined, hi: string | undefined): string {
  if (lo !== undefined && compareDecimals(value, lo) < 0) return lo;
  if (hi !== undefined && compareDecimals(value, hi) > 0) return hi;
  return value;
}

function normalizeRange(schema: RangeFilterSchema, value: RangeFilterValue | undefined): RangeFilterValue | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const digits = digitsOf(schema);
  const lo = schema.min === undefined ? undefined : (normalizeDecimal(schema.min, 9) ?? undefined);
  const hi = schema.max === undefined ? undefined : (normalizeDecimal(schema.max, 9) ?? undefined);
  // An end that is not a decimal spoils the range: dropping only it would turn '1e3..5' into 'up to 5'.
  const end = (v: string | undefined): string | undefined | null => {
    if (v === undefined || v === '') return undefined;
    const n = typeof v === 'string' ? normalizeDecimal(v, digits) : null;
    return n === null ? null : clampDecimal(n, lo, hi);
  };
  const a = end(value.min);
  const b = end(value.max);
  if (a === null || b === null) return undefined;
  let min = a;
  let max = b;
  if (min !== undefined && max !== undefined && compareDecimals(min, max) > 0) [min, max] = [max, min];
  if (min === undefined && max === undefined) return undefined;
  return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
}

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function normalizeMulti(schema: MultiFilterSchema, value: readonly string[] | undefined): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = schema.options;
  const unique = [...new Set((value as readonly unknown[]).filter((v): v is string => typeof v === 'string' && v !== '' && v.length <= MAX_VALUE && (!allowed || allowed.includes(v))))];
  const ordered = allowed ? unique.toSorted((a, b) => allowed.indexOf(a) - allowed.indexOf(b)) : unique.toSorted(byCodeUnit);
  const kept = ordered.slice(0, schema.maxItems ?? MAX_ITEMS);
  return kept.length > 0 ? kept : undefined;
}

const keysOf = (schema: FilterSchema) => {
  const keys = Object.keys(schema).toSorted(byCodeUnit);
  for (const k of keys) if (!KEY.test(k)) throw new RangeError(`Filter key "${k}" cannot be a query parameter name`);
  return keys;
};

/** The canonical form of a set of filters: ends in canonical decimals, crossed ends swapped, multi values deduplicated and ordered, an empty or off filter removed, unknown keys dropped.
 *
 * @stability beta
 */
export function normalizeFilters<S extends FilterSchema>(schema: S, values: FilterValues<S> | null | undefined): FilterValues<S> {
  const out: Record<string, unknown> = {};
  const source = (values ?? {}) as Record<string, unknown>;
  for (const key of keysOf(schema)) {
    const field = schema[key]!;
    const raw = source[key];
    const next = field.kind === 'range' ? normalizeRange(field, raw as RangeFilterValue | undefined) : field.kind === 'multi' ? normalizeMulti(field, raw as readonly string[] | undefined) : raw === true ? true : undefined;
    if (next !== undefined) out[key] = next;
  }
  return out as FilterValues<S>;
}

const decodeItem = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

/**
 * The filters as query parameters, written by key. Parameters in `base` that are not schema keys are kept (a
 * `sort`, a `page`), in their order and before the filters; the schema's own keys in `base` are replaced.
 *
 * @stability beta
 */
export function filtersToSearchParams<S extends FilterSchema>(schema: S, values: FilterValues<S> | null | undefined, base?: SearchParamsInput): URLSearchParams {
  const keys = keysOf(schema);
  const out = new URLSearchParams();
  for (const [k, v] of toSearchParams(base)) if (!(k in schema)) out.append(k, v);
  const clean = normalizeFilters(schema, values) as Record<string, unknown>;
  for (const key of keys) {
    const value = clean[key];
    if (value === undefined) continue;
    const field = schema[key]!;
    if (field.kind === 'range') {
      const r = value as RangeFilterValue;
      out.set(key, `${r.min ?? ''}..${r.max ?? ''}`);
    } else if (field.kind === 'multi') out.set(key, (value as readonly string[]).map(encodeURIComponent).join(','));
    else out.set(key, '1');
  }
  return out;
}

/** The filters in a query. Reads only the schema's keys; never throws on input; the result is normalised.
 *
 * @stability beta
 */
export function searchParamsToFilters<S extends FilterSchema>(schema: S, input: SearchParamsInput): FilterValues<S> {
  const params = toSearchParams(input);
  const out: Record<string, unknown> = {};
  for (const key of keysOf(schema)) {
    const text = params.getAll(key).at(-1);
    if (text === undefined) continue;
    const field = schema[key]!;
    if (field.kind === 'range') {
      const at = text.indexOf('..');
      if (at < 0) continue;
      out[key] = { min: text.slice(0, at) || undefined, max: text.slice(at + 2) || undefined };
    } else if (field.kind === 'multi') out[key] = text.slice(0, 4000).split(',').slice(0, 256).map(decodeItem);
    else out[key] = text === '1' || text === 'true';
  }
  return normalizeFilters(schema, out as FilterValues<S>);
}

/** The query string for a set of filters, without the `?`. Same as `filtersToSearchParams(...).toString()`.
 *
 * @stability beta
 */
export function filtersToQueryString<S extends FilterSchema>(schema: S, values: FilterValues<S> | null | undefined, base?: SearchParamsInput): string {
  return filtersToSearchParams(schema, values, base).toString();
}

/**
 * A shareable link: `link` (absolute or a path; its own other query parameters and hash are kept) with the
 * filters in its query. The schema's keys already in `link` are replaced.
 *
 * @stability beta
 */
export function filtersToLink<S extends FilterSchema>(link: string, schema: S, values: FilterValues<S> | null | undefined): string {
  const hashAt = link.indexOf('#');
  const hash = hashAt < 0 ? '' : link.slice(hashAt);
  const rest = hashAt < 0 ? link : link.slice(0, hashAt);
  const queryAt = rest.indexOf('?');
  const path = queryAt < 0 ? rest : rest.slice(0, queryAt);
  const query = filtersToQueryString(schema, values, queryAt < 0 ? '' : rest.slice(queryAt + 1));
  return `${path}${query ? `?${query}` : ''}${hash}`;
}

/** The keys of the filters that are set, in written order.
 *
 * @stability beta
 */
export function activeFilterKeys<S extends FilterSchema>(schema: S, values: FilterValues<S> | null | undefined): (keyof S & string)[] {
  const clean = normalizeFilters(schema, values) as Record<string, unknown>;
  return keysOf(schema).filter((k) => clean[k] !== undefined) as (keyof S & string)[];
}

/** Two sets of filters are the same once normalised.
 *
 * @stability beta
 */
export function filtersEqual<S extends FilterSchema>(schema: S, a: FilterValues<S> | null | undefined, b: FilterValues<S> | null | undefined): boolean {
  return filtersToQueryString(schema, a) === filtersToQueryString(schema, b);
}
