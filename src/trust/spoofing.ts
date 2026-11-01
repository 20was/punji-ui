/**
 * Name spoofing checks for money movement: before someone sends money to "PayPal", is it really Latin "PayPal" or
 * "PаyPal" with a Cyrillic "а"? Pure and dependency-free, after Unicode UTS #39 (security mechanisms): mixed-script
 * detection with the "highly restrictive" allowances (Latin with Han and Japanese kana, Han with Bopomofo, Han with
 * Hangul), a skeleton for confusable comparison, and checks for bidi controls, invisible characters, controls,
 * compatibility forms and stacked marks. The confusable table is a focused subset (Cyrillic, Greek, Armenian and
 * Latin look-alikes of Latin letters and digits), not the full Unicode confusables.txt: it catches the attacks seen on
 * payee names, it does not prove a name is safe. Your server still verifies the payee.
 */

export type SpoofIssueKind =
  | 'bidi-control'
  | 'invisible'
  | 'control'
  | 'mixed-script'
  | 'confusable-characters'
  | 'whole-script-confusable'
  | 'compatibility-form'
  | 'stacked-marks'
  | 'unusual-space'
  | 'lookalike';

export interface SpoofIssue {
  /** What was found. */
  kind: SpoofIssueKind;
  /** 'high' issues should stop the flow until the person checks; 'review' ones deserve a visible note. */
  severity: 'high' | 'review';
  /** A sentence for the person, in English. Map `kind` to your own words for other languages. */
  message: string;
  /** The offending characters as U+XXXX code points, when there are any. */
  codePoints?: string[];
}

export interface SpoofCheck {
  /** 'none': nothing found. 'review': show a note. 'high': warn before money moves. */
  risk: 'none' | 'review' | 'high';
  /** Every problem found, in the order checked. */
  issues: SpoofIssue[];
  /** Scripts of the letters, in order of appearance (Common and Inherited left out): ['Latin', 'Cyrillic']. */
  scripts: string[];
  /** The name to show: NFC, with bidi controls, invisible characters and controls removed and spaces tidied. Still render it inside <bdi>. */
  display: string;
  /** The UTS #39-style skeleton used for comparison. Two names with the same skeleton look alike. */
  skeleton: string;
  /** When `known` was passed: the known name this one imitates (same skeleton, different text). */
  lookalikeOf?: string;
}

export interface SpoofOptions {
  /** Names the person already trusts (saved payees, the verified account name). A different name that looks the same is flagged 'high'. */
  known?: readonly string[];
}

const SCRIPTS = [
  'Latin', 'Cyrillic', 'Greek', 'Armenian', 'Georgian', 'Hebrew', 'Arabic', 'Syriac', 'Thaana', 'Devanagari', 'Bengali',
  'Gurmukhi', 'Gujarati', 'Oriya', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Thai', 'Lao', 'Tibetan', 'Myanmar',
  'Khmer', 'Mongolian', 'Ethiopic', 'Cherokee', 'Hangul', 'Hiragana', 'Katakana', 'Bopomofo', 'Han',
] as const;
const SCRIPT_TESTS = SCRIPTS.map(name => [name, new RegExp(`\\p{Script=${name}}`, 'u')] as const);
// Scripts in which ZERO WIDTH JOINER and NON-JOINER are part of correct spelling.
const JOINING = new Set(['Arabic', 'Syriac', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Oriya', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Mongolian', 'Khmer', 'Myanmar']);
const LOOKALIKE_SCRIPTS = new Set(['Cyrillic', 'Greek', 'Armenian', 'Cherokee']);

const BIDI_STRONG = /[\u202A-\u202E\u2066-\u2069]/u;
const BIDI_MARK = /[\u061C\u200E\u200F]/u;
const BIDI_ALL = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;
// Invisible and control characters as code point ranges (a regex class would hold combining and control characters).
const INVISIBLE_RANGES: readonly (readonly [number, number])[] = [
  [0xAD, 0xAD], [0x34F, 0x34F], [0x115F, 0x1160], [0x17B4, 0x17B5], [0x180B, 0x180F], [0x200B, 0x200B], [0x2060, 0x2064],
  [0x3164, 0x3164], [0xFE00, 0xFE0F], [0xFEFF, 0xFEFF], [0xFFA0, 0xFFA0], [0xE0000, 0xE007F],
];
const CONTROL_RANGES: readonly (readonly [number, number])[] = [[0x0, 0x8], [0xB, 0xC], [0xE, 0x1F], [0x7F, 0x9F]];
const inRanges = (ranges: readonly (readonly [number, number])[]) => (ch: string) => {
  const cp = ch.codePointAt(0)!;
  return ranges.some(([from, to]) => cp >= from && cp <= to);
};
const isInvisible = inRanges(INVISIBLE_RANGES);
const isControl = inRanges(CONTROL_RANGES);
const JOINERS = /[\u200C\u200D]/u;
const ODD_SPACE = /[\t\n\r\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/u;
const STACKED = /\p{M}{4,}/u;

// Look-alikes of Latin letters and digits, mapped to the Latin letter they imitate (case kept where it shows).
const CONFUSABLE: Readonly<Record<string, string>> = {
  // Cyrillic
  а: 'a', в: 'B', с: 'c', е: 'e', һ: 'h', і: 'i', ј: 'j', к: 'k', м: 'M', н: 'H', о: 'o', р: 'p', ԛ: 'q', ѕ: 's', т: 'T',
  у: 'y', х: 'x', ԝ: 'w', ү: 'y', ӏ: 'l', ԁ: 'd', ɡ: 'g', ь: 'b', ѵ: 'v',
  А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', І: 'I', Ј: 'J', К: 'K', М: 'M', О: 'O', Р: 'P', Ѕ: 'S', Т: 'T', Х: 'X', У: 'Y',
  Ү: 'Y', Ԛ: 'Q', Ԝ: 'W', Ӏ: 'l', Ѵ: 'V',
  // Greek
  α: 'a', ο: 'o', ρ: 'p', ν: 'v', υ: 'u', ι: 'i', κ: 'k', χ: 'x', γ: 'y', ϲ: 'c', ϳ: 'j',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', Ϲ: 'C',
  // Armenian
  օ: 'o', ս: 'u', ո: 'n', հ: 'h', ց: 'g', զ: 'q', Տ: 'S', Օ: 'O', Ս: 'U',
  // Cherokee
  Ꭺ: 'A', Ᏼ: 'B', Ꮯ: 'C', Ꭼ: 'E', Ꮋ: 'H', Ꮖ: 'I', Ꭻ: 'J', Ꮶ: 'K', Ꮇ: 'M', Ꮲ: 'P', Ꮪ: 'S', Ꭲ: 'T', Ꮃ: 'W', Ꮤ: 'W', Ꮓ: 'Z',
  // Latin and digits that imitate other Latin letters
  ı: 'i', ɑ: 'a', ɩ: 'i', ʏ: 'y', 'ꓲ': 'l', '0': 'o', '1': 'l', I: 'l', '|': 'l', ǀ: 'l',
};

const codePoint = (ch: string) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
const unique = (items: string[]) => [...new Set(items)];

function scriptOf(ch: string): string | null {
  for (const [name, test] of SCRIPT_TESTS) if (test.test(ch)) return name;
  return null;
}

// ZWJ/ZWNJ are invisible spoofing unless they sit next to a letter (or mark) of a script that needs them.
function strayJoinerAt(chars: string[], scriptAt: (string | null)[], i: number): boolean {
  if (!JOINERS.test(chars[i]!)) return false;
  const near = (start: number, step: 1 | -1) => {
    for (let k = start; k >= 0 && k < chars.length; k += step) {
      const script = scriptAt[k];
      if (script) return JOINING.has(script);
      if (!/\p{M}/u.test(chars[k]!)) return false;
    }
    return false;
  };
  return !(near(i - 1, -1) || near(i + 1, 1));
}

function cleaned(name: string): string {
  return [...name.normalize('NFC').replace(BIDI_ALL, '')].filter((ch) => !isInvisible(ch) && !isControl(ch)).join('');
}

/**
 * The comparison skeleton: NFKC (full-width and mathematical letters fold), hidden characters removed, look-alikes
 * mapped to the Latin letter they imitate, lowercased, "rn" read as "m", spaces collapsed.
 * `skeleton('PаyPaI')` and `skeleton('paypal')` are both 'paypal'.
 */
export function skeleton(text: string): string {
  const folded = cleaned(text).normalize('NFKC').replace(/[\u200C\u200D]/gu, '');
  let out = '';
  for (const ch of folded) out += CONFUSABLE[ch] ?? ch;
  return out.toLowerCase().replace(/rn/g, 'm').replace(/\s+/gu, ' ').trim();
}

/** True when two different names look the same (equal skeletons, different text). */
export function areConfusable(a: string, b: string): boolean {
  return a.normalize('NFC') !== b.normalize('NFC') && skeleton(a) === skeleton(b);
}

const ALLOWED_SETS: readonly (readonly string[])[] = [
  ['Latin', 'Han', 'Hiragana', 'Katakana'],
  ['Latin', 'Han', 'Bopomofo'],
  ['Latin', 'Han', 'Hangul'],
];

/**
 * Checks a payee or account name for the tricks used to make one name pass for another. Returns the risk, the
 * issues with a sentence each, the scripts, a cleaned `display` string and the skeleton. Pass `known` (saved payees,
 * the bank's verified name) to catch a look-alike of a name the person trusts.
 *
 * ```ts
 * detectSpoofing('PаyPal').risk;                       // 'high': Cyrillic "а" among Latin letters
 * detectSpoofing('Ram Bahadur Thapa').risk;            // 'none'
 * detectSpoofing('Paypa1', { known: ['Paypal'] }).lookalikeOf; // 'Paypal'
 * ```
 */
export function detectSpoofing(name: string, options: SpoofOptions = {}): SpoofCheck {
  if (typeof name !== 'string') throw new TypeError('detectSpoofing expects a string');
  const issues: SpoofIssue[] = [];
  const add = (kind: SpoofIssueKind, severity: SpoofIssue['severity'], message: string, chars: string[] = []) => {
    const codePoints = unique(chars).map(codePoint);
    issues.push(codePoints.length ? { kind, severity, message, codePoints } : { kind, severity, message });
  };
  const text = name.length > 512 ? name.slice(0, 512) : name;
  const chars = [...text.normalize('NFC')];
  const scriptAt = chars.map(scriptOf);
  const scripts = unique(scriptAt.filter((s): s is string => s !== null));

  const strong = chars.filter(ch => BIDI_STRONG.test(ch));
  if (strong.length) add('bidi-control', 'high', 'Contains hidden direction controls that can reorder the letters you see.', strong);
  const marks = chars.filter(ch => BIDI_MARK.test(ch));
  if (marks.length && !strong.length) add('bidi-control', 'review', 'Contains invisible direction marks.', marks);
  const stray = chars.map((_, i) => strayJoinerAt(chars, scriptAt, i));
  const hidden = chars.filter((ch, i) => isInvisible(ch) || stray[i]);
  if (hidden.length) add('invisible', 'high', 'Contains invisible characters, so two names that look the same can differ.', hidden);
  const controls = chars.filter(isControl);
  if (controls.length) add('control', 'high', 'Contains control characters that are never part of a name.', controls);

  const nonLatin = scripts.filter(s => s !== 'Latin');
  const allowed = scripts.length <= 1 || ALLOWED_SETS.some(set => scripts.every(s => set.includes(s)));
  const letters = chars.filter((_, i) => scriptAt[i] !== null);
  const lookalikes = chars.filter((ch, i) => scriptAt[i] !== 'Latin' && scriptAt[i] !== null && CONFUSABLE[ch] !== undefined);
  if (scripts.includes('Latin') && nonLatin.some(s => LOOKALIKE_SCRIPTS.has(s)) && lookalikes.length) {
    add('confusable-characters', 'high', `Mixes Latin letters with ${nonLatin.join(' and ')} letters that look like them.`, lookalikes);
  } else if (!allowed) {
    add('mixed-script', 'review', `Mixes letters from ${scripts.join(', ')}.`);
  }
  if (!scripts.includes('Latin') && nonLatin.length === 1 && LOOKALIKE_SCRIPTS.has(nonLatin[0]!) && letters.length >= 2 && letters.every(ch => CONFUSABLE[ch] !== undefined)) {
    add('whole-script-confusable', 'review', `Every letter is ${nonLatin[0]} but looks like a Latin letter.`, letters);
  }

  const nfc = text.normalize('NFC');
  if (nfc.normalize('NFKC') !== nfc) {
    const forms = chars.filter(ch => ch.normalize('NFKC') !== ch && !ODD_SPACE.test(ch));
    if (forms.length) add('compatibility-form', 'review', 'Uses full-width, styled or other compatibility letters.', forms);
  }
  if (STACKED.test(nfc)) add('stacked-marks', 'review', 'Stacks many accent marks on one letter.');
  const spaces = chars.filter(ch => ODD_SPACE.test(ch));
  if (spaces.length || /^\s|\s$|\s{2}/u.test(nfc)) add('unusual-space', 'review', 'Has unusual, doubled or leading and trailing spaces.', spaces);

  const sk = skeleton(text);
  let lookalikeOf: string | undefined;
  for (const known of options.known ?? []) {
    if (areConfusable(text, known)) { lookalikeOf = known; break; }
  }
  if (lookalikeOf !== undefined) add('lookalike', 'high', `Looks like "${cleaned(lookalikeOf)}" but is a different name.`);

  const risk = issues.some(i => i.severity === 'high') ? 'high' : issues.length ? 'review' : 'none';
  const display = cleaned(chars.filter((_, i) => !stray[i]).join('')).replace(/\s+/gu, ' ').trim();
  const result: SpoofCheck = { risk, issues, scripts, display, skeleton: sk };
  if (lookalikeOf !== undefined) result.lookalikeOf = lookalikeOf;
  return result;
}
