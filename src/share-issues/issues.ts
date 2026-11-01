/**
 * Share issues (IPO, FPO, right, mutual fund, debenture): the issue record, its status on a given day and the kitta
 * (unit) rules an application must meet. Pure: no React, no browser globals, no calendar conversion. Dates are
 * Gregorian `YYYY-MM-DD` civil days; money is bigint minor units (paisa); kitta are bigint whole units.
 */

export type ShareIssueKind = 'ipo' | 'fpo' | 'right' | 'mutual-fund' | 'debenture';

/** Short English names for each kind. Pass your own words to the components for Nepali. */
export const SHARE_ISSUE_KIND_LABELS: Readonly<Record<ShareIssueKind, string>> = Object.freeze({
  ipo: 'IPO', fpo: 'FPO', right: 'Right share', 'mutual-fund': 'Mutual fund', debenture: 'Debenture',
});

export interface ShareIssue {
  /** Stable unique id (the row key). */
  id: string;
  /** The issuing company or scheme ("Sanima Khimti Hydro"). Display text. */
  company: string;
  /** Trading symbol, when it has one. */
  symbol?: string;
  kind: ShareIssueKind;
  /** Who the tranche is for ("Ordinary", "Local people", "Foreign employment"). Display text. */
  shareGroup?: string;
  /** First day applications are taken, Gregorian `YYYY-MM-DD`. */
  openDate: string;
  /** Last day applications are taken (inclusive), Gregorian `YYYY-MM-DD`. Pass the extended date if it was extended. */
  closeDate: string;
  /** Units on offer in this tranche. */
  units: bigint;
  /** Price of one unit in minor units (Rs 100 is `10000n`). */
  pricePerUnit: bigint;
  /** Fewest units one application may ask for. */
  minKitta: bigint;
  /** Most units one application may ask for. */
  maxKitta: bigint;
  /** Applications must be a multiple of this many units. Default `10n`. Use `1n` for no multiple rule. */
  kittaMultiple?: bigint;
  /** The issue manager (a merchant bank). Display text. */
  issueManager?: string;
}

/** Where an issue stands on a given day. `closing-today` is the last open day. */
export type IssueStatus = 'upcoming' | 'open' | 'closing-today' | 'closed';

export const ISSUE_STATUS_LABELS: Readonly<Record<IssueStatus, string>> = Object.freeze({
  upcoming: 'Upcoming', open: 'Open', 'closing-today': 'Closes today', closed: 'Closed',
});

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a strict Gregorian `YYYY-MM-DD`; throws on anything else. Never reads the host time zone. */
export function isoDayNumber(value: string): number {
  const m = ISO.exec(value);
  if (!m) throw new RangeError(`Expected a Gregorian YYYY-MM-DD date: ${value}`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new RangeError(`Not a real date: ${value}`);
  return Math.round(ms / 86_400_000);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return isoDayNumber(to) - isoDayNumber(from);
}

/** The issue's status on `today` (a Gregorian `YYYY-MM-DD` you pass, so server and client agree). Throws when close is before open. */
export function issueStatus(issue: Pick<ShareIssue, 'openDate' | 'closeDate'>, today: string): IssueStatus {
  const open = isoDayNumber(issue.openDate), close = isoDayNumber(issue.closeDate), now = isoDayNumber(today);
  if (close < open) throw new RangeError('Issue closeDate is before openDate');
  if (now < open) return 'upcoming';
  if (now > close) return 'closed';
  return now === close ? 'closing-today' : 'open';
}

const STATUS_ORDER: Record<IssueStatus, number> = { 'closing-today': 0, open: 1, upcoming: 2, closed: 3 };

/** A new array: open issues first (closing soonest first), then upcoming (opening soonest first), then closed (most recent first). Stable. */
export function sortIssues<T extends Pick<ShareIssue, 'openDate' | 'closeDate'>>(issues: readonly T[], today: string): T[] {
  const keyed = issues.map((issue, index) => ({ issue, index, status: issueStatus(issue, today) }));
  return keyed.toSorted((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s) return s;
    const d = a.status === 'upcoming' ? daysBetween(b.issue.openDate, a.issue.openDate)
      : a.status === 'closed' ? daysBetween(a.issue.closeDate, b.issue.closeDate)
        : daysBetween(b.issue.closeDate, a.issue.closeDate);
    return d || a.index - b.index;
  }).map((k) => k.issue);
}

/** The kitta rules of one application. */
export interface KittaRules {
  min: bigint;
  max: bigint;
  /** Applications must be a multiple of this. Default `10n`. */
  multiple?: bigint;
}

export type KittaProblem = 'empty' | 'invalid' | 'below-min' | 'above-max' | 'not-multiple';

export type KittaCheck = { ok: true; kitta: bigint } | { ok: false; problem: KittaProblem };

const DEVANAGARI = '०१२३४५६७८९';

/** Typed kitta to a whole number: Devanagari digits, spaces and grouping commas are accepted. null for empty or anything that is not a whole number. */
export function parseKitta(text: string): bigint | null {
  const ascii = text.replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d))).replace(/[\s,]/g, '');
  if (!/^\d{1,15}$/.test(ascii)) return null;
  return BigInt(ascii);
}

/** The rules of an issue as `KittaRules`. */
export function kittaRulesOf(issue: Pick<ShareIssue, 'minKitta' | 'maxKitta' | 'kittaMultiple'>): KittaRules {
  return { min: issue.minKitta, max: issue.maxKitta, multiple: issue.kittaMultiple ?? 10n };
}

/** Checks a kitta (text or a parsed bigint) against the rules. The multiple rule is `kitta % multiple === 0`. Throws on rules that cannot be met. */
export function checkKitta(input: string | bigint | null, rules: KittaRules): KittaCheck {
  const multiple = rules.multiple ?? 10n;
  if (multiple < 1n || rules.min < 1n || rules.max < rules.min) throw new RangeError('Kitta rules need 1 <= min <= max and multiple >= 1');
  if (input === null || input === '') return { ok: false, problem: 'empty' };
  const kitta = typeof input === 'bigint' ? input : parseKitta(input);
  if (kitta === null) return { ok: false, problem: input.toString().trim() === '' ? 'empty' : 'invalid' };
  if (kitta < rules.min) return { ok: false, problem: 'below-min' };
  if (kitta > rules.max) return { ok: false, problem: 'above-max' };
  if (kitta % multiple !== 0n) return { ok: false, problem: 'not-multiple' };
  return { ok: true, kitta };
}

/** Plain English for a kitta problem, naming the rule. Replace it with your own words for Nepali. */
export function kittaMessage(problem: KittaProblem, rules: KittaRules): string {
  const multiple = rules.multiple ?? 10n;
  switch (problem) {
    case 'empty': return 'Enter the number of units (kitta).';
    case 'invalid': return 'Enter whole units only, such as 10.';
    case 'below-min': return `Apply for at least ${rules.min} units.`;
    case 'above-max': return `Apply for at most ${rules.max} units.`;
    case 'not-multiple': return `Units must be a multiple of ${multiple}.`;
  }
}

/** The kitta nearest to `kitta` that meets the rules (ties go down); null when the range holds no multiple. */
export function nearestValidKitta(kitta: bigint, rules: KittaRules): bigint | null {
  const multiple = rules.multiple ?? 10n;
  const lowest = ((rules.min + multiple - 1n) / multiple) * multiple;
  const highest = (rules.max / multiple) * multiple;
  if (lowest > highest) return null;
  if (kitta <= lowest) return lowest;
  if (kitta >= highest) return highest;
  const down = (kitta / multiple) * multiple;
  return kitta - down <= down + multiple - kitta ? down : down + multiple;
}

/** The amount to block for an application: `kitta × pricePerUnit`, exact. */
export function issueAmount(kitta: bigint, pricePerUnit: bigint): bigint {
  if (kitta < 0n || pricePerUnit < 0n) throw new RangeError('Kitta and price must not be negative');
  return kitta * pricePerUnit;
}
