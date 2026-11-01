/**
 * Amounts in words for bills and cheques, in the South Asian system: hundred, thousand, lakh, crore, arab, kharab
 * (an amount past 99 kharab is read as "<n> kharab"). English or Nepali. `system: 'international'` reads English in
 * thousand, million, billion, trillion instead, and `currencyAmountInWords` names any ISO 4217 currency's units
 * (dollars and cents, pounds and pence, yen). Exact: the amount is bigint minor units and nothing passes through Number.
 */

export type WordsLanguage = 'en' | 'ne';

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Nepali words for 0 to 99, in the spelling common on Nepali bills. Spellings vary; pass `numberWords` to use your own. */
export const NEPALI_NUMBER_WORDS: readonly string[] = Object.freeze([
  'शून्य', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
  'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस',
  'बीस', 'एक्काइस', 'बाइस', 'तेइस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताइस', 'अट्ठाइस', 'उनन्तीस',
  'तीस', 'एकतीस', 'बत्तीस', 'तेत्तीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अठतीस', 'उनन्चालीस',
  'चालीस', 'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैंतालीस', 'छयालीस', 'सतचालीस', 'अठचालीस', 'उनन्चास',
  'पचास', 'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चउन्न', 'पचपन्न', 'छपन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठी',
  'साठी', 'एकसट्ठी', 'बयसट्ठी', 'त्रिसट्ठी', 'चौंसट्ठी', 'पैंसट्ठी', 'छयसट्ठी', 'सतसट्ठी', 'अठसट्ठी', 'उनन्सत्तरी',
  'सत्तरी', 'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'असी', 'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे',
  'नब्बे', 'एकान्नब्बे', 'बयान्नब्बे', 'त्रियान्नब्बे', 'चौरान्नब्बे', 'पन्चान्नब्बे', 'छयान्नब्बे', 'सन्तान्नब्बे', 'अन्ठान्नब्बे', 'उनान्सय',
]);

const SCALES: readonly { value: bigint; en: string; ne: string }[] = [
  { value: 100_000_000_000n, en: 'kharab', ne: 'खर्ब' },
  { value: 1_000_000_000n, en: 'arab', ne: 'अर्ब' },
  { value: 10_000_000n, en: 'crore', ne: 'करोड' },
  { value: 100_000n, en: 'lakh', ne: 'लाख' },
  { value: 1_000n, en: 'thousand', ne: 'हजार' },
  { value: 100n, en: 'hundred', ne: 'सय' },
];

const INTERNATIONAL: readonly { value: bigint; en: string }[] = [
  { value: 1_000_000_000_000n, en: 'trillion' },
  { value: 1_000_000_000n, en: 'billion' },
  { value: 1_000_000n, en: 'million' },
  { value: 1_000n, en: 'thousand' },
  { value: 100n, en: 'hundred' },
];

export interface IntegerWordsOptions {
  /** 'en' (default) or 'ne'. */
  language?: WordsLanguage;
  /** 'south-asian' (default: lakh, crore, arab, kharab) or 'international' (million, billion, trillion; English only). */
  system?: 'south-asian' | 'international';
  /** Your own 100 words for 0 to 99 (index = number). Overrides the built-in list for the language. */
  numberWords?: readonly string[];
  /** Your own words for the scale names, largest first: kharab, arab, crore, lakh, thousand, hundred. */
  scaleWords?: readonly [string, string, string, string, string, string];
}

function below100(n: number, options: IntegerWordsOptions): string {
  if (options.numberWords) return options.numberWords[n]!;
  if (options.language === 'ne') return NEPALI_NUMBER_WORDS[n]!;
  if (n < 20) return EN_ONES[n]!;
  const tens = EN_TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${tens}-${EN_ONES[n % 10]}` : tens;
}

function positive(n: bigint, options: IntegerWordsOptions): string[] {
  const parts: string[] = [];
  let rest = n;
  if (options.system === 'international') {
    for (const scale of INTERNATIONAL) {
      if (rest < scale.value) continue;
      parts.push(...positive(rest / scale.value, options), scale.en);
      rest %= scale.value;
    }
    if (rest > 0n) parts.push(below100(Number(rest), options));
    return parts;
  }
  SCALES.forEach((scale, index) => {
    if (rest < scale.value) return;
    const count = rest / scale.value;
    rest %= scale.value;
    const name = options.scaleWords?.[index] ?? (options.language === 'ne' ? scale.ne : scale.en);
    parts.push(...positive(count, options), name);
  });
  if (rest > 0n) parts.push(below100(Number(rest), options));
  return parts;
}

/** A whole number in words, lowercase: 123456n is "one lakh twenty-three thousand four hundred fifty-six". */
export function integerInWords(value: bigint, options: IntegerWordsOptions = {}): string {
  if (typeof value !== 'bigint') throw new TypeError('integerInWords expects a bigint');
  if (options.numberWords && options.numberWords.length !== 100) throw new RangeError('numberWords must have 100 entries (0 to 99)');
  if (options.system === 'international' && options.language === 'ne') throw new RangeError("system 'international' is English only");
  if (value === 0n) return below100(0, options);
  const words = positive(value < 0n ? -value : value, options).join(' ');
  return value < 0n ? `${options.language === 'ne' ? 'ऋण' : 'minus'} ${words}` : words;
}

export interface AmountInWordsOptions extends IntegerWordsOptions {
  /** Minor-unit digits of the currency. Default 2 (paisa). 0 for a currency with no minor unit. */
  scale?: number;
  /** Read the minor part as a fraction ("and 50/100") instead of words with a unit name, as cheques in many countries do. Default false. */
  fractionAsDigits?: boolean;
  /** Name of the major unit. Default 'rupees' (English) or 'रुपैयाँ' (Nepali). */
  major?: string;
  /** Name of the minor unit. Default 'paisa' or 'पैसा'. */
  minor?: string;
  /** Word after the amount. Default 'only' or 'मात्र'. Pass '' for none. */
  suffix?: string;
  /** Where the major-unit word goes: 'before' ("Rupees one hundred") or 'after' ("one hundred rupees"). Default 'before' in English, 'after' in Nepali. */
  unitPosition?: 'before' | 'after';
  /** Letter case for English: 'title' (default, "Rupees One Lakh Only"), 'sentence' or 'lower'. Nepali has no case. */
  case?: 'title' | 'sentence' | 'lower';
}

// Title case every word except "and" ("Rupees One Hundred and Five Paisa Only").
const title = (text: string) => text.replace(/(^|[\s-])([a-z]+)/g, (_, gap: string, word: string) => gap + (word === 'and' && gap !== '' ? word : word.charAt(0).toUpperCase() + word.slice(1)));

/**
 * An amount in minor units in words, for the "amount in words" line of a bill or a cheque:
 * `amountInWords(12345678n)` is "Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paisa Only".
 * Zero paisa is left out. A negative amount starts with "minus".
 */
export function amountInWords(minorUnits: bigint, options: AmountInWordsOptions = {}): string {
  if (typeof minorUnits !== 'bigint') throw new TypeError('amountInWords expects bigint minor units');
  const scale = options.scale ?? 2;
  if (!Number.isInteger(scale) || scale < 0 || scale > 9) throw new RangeError('scale must be an integer from 0 to 9');
  const ne = options.language === 'ne';
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const unit = 10n ** BigInt(scale);
  const whole = absolute / unit;
  const fraction = absolute % unit;
  const major = options.major ?? (ne ? 'रुपैयाँ' : 'rupees');
  const minor = options.minor ?? (ne ? 'पैसा' : 'paisa');
  const suffix = options.suffix ?? (ne ? 'मात्र' : 'only');
  const position = options.unitPosition ?? (ne ? 'after' : 'before');
  const wholeWords = integerInWords(whole, options);
  const parts: string[] = [];
  if (negative) parts.push(ne ? 'ऋण' : 'minus');
  if (position === 'before') parts.push(major, wholeWords);
  else parts.push(wholeWords, major);
  if (fraction > 0n && options.fractionAsDigits) parts.push(ne ? '' : 'and', `${fraction.toString().padStart(scale, '0')}/${unit}`);
  else if (fraction > 0n) parts.push(ne ? '' : 'and', integerInWords(fraction, options), minor);
  if (suffix) parts.push(suffix);
  const text = parts.filter(Boolean).join(' ');
  if (ne) return text;
  const mode = options.case ?? 'title';
  return mode === 'title' ? title(text) : mode === 'sentence' ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// Unit words for common currencies: [major plural, minor plural]. Others take Intl's plural name and a "50/100" fraction.
const CURRENCY_UNITS: Readonly<Record<string, readonly [string, string]>> = {
  NPR: ['rupees', 'paisa'], INR: ['rupees', 'paise'], PKR: ['rupees', 'paisa'], LKR: ['rupees', 'cents'], BDT: ['taka', 'poisha'],
  USD: ['dollars', 'cents'], AUD: ['dollars', 'cents'], CAD: ['dollars', 'cents'], NZD: ['dollars', 'cents'], SGD: ['dollars', 'cents'], HKD: ['dollars', 'cents'],
  EUR: ['euros', 'cents'], GBP: ['pounds', 'pence'], JPY: ['yen', ''], CNY: ['yuan', 'fen'], CHF: ['francs', 'centimes'],
  AED: ['dirhams', 'fils'], SAR: ['riyals', 'halalas'], QAR: ['riyals', 'dirhams'], KWD: ['dinars', 'fils'], BHD: ['dinars', 'fils'], OMR: ['rials', 'baisa'],
  MYR: ['ringgit', 'sen'], THB: ['baht', 'satang'], ZAR: ['rand', 'cents'],
};

export interface CurrencyWordsOptions extends Omit<AmountInWordsOptions, 'scale' | 'major' | 'minor' | 'language'> {
  /** Minor-unit digits. Default: Intl's for the currency (JPY 0, USD 2, KWD 3). */
  scale?: number;
}

/**
 * Any currency's amount in English words, for a "read it back" line before money moves:
 * `currencyAmountInWords(125050n, 'USD')` is "One Thousand Two Hundred Fifty Dollars and Fifty Cents Only".
 * NPR, INR, PKR, LKR and BDT read in lakh and crore, the rest in million and billion (override with `system`).
 * Currencies without built-in unit words use Intl's English plural name and read the minor part as "50/100".
 */
export function currencyAmountInWords(minorUnits: bigint, currency: string, options: CurrencyWordsOptions = {}): string {
  const code = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new RangeError(`Invalid currency code: ${currency}`);
  const scale = options.scale ?? (new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2);
  const known = CURRENCY_UNITS[code];
  const major = known?.[0] ?? (new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'name' }).formatToParts(2).find(part => part.type === 'currency')?.value ?? code);
  const southAsian = code === 'NPR' || code === 'INR' || code === 'PKR' || code === 'LKR' || code === 'BDT';
  return amountInWords(minorUnits, {
    system: southAsian ? 'south-asian' : 'international',
    unitPosition: 'after',
    fractionAsDigits: !known?.[1],
    ...options,
    scale, major, minor: known?.[1] ?? '', language: 'en',
  });
}
