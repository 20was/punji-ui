// The single source for the conformance cards. The docs page renders these cards and
// test/money-conformance.test.tsx reads the same list: every guarantee a card claims must have a proof in that test
// (keyed "<card>.<guarantee>"), and the test fails if a claim has no proof or a proof has no claim. Pure data, no JSX.

export type GuaranteeId = 'exact' | 'rounding' | 'grouping' | 'sign' | 'spoken' | 'axe';

export const GUARANTEES: Readonly<Record<GuaranteeId, { label: string; meaning: string }>> = {
  exact: { label: 'Exact bigint', meaning: 'Every digit of a bigint minor-unit amount is shown or kept; nothing passes through a float.' },
  rounding: { label: 'Rounding', meaning: 'No silent rounding: the component never rounds an exact amount, or says where it does.' },
  grouping: { label: 'Locale grouping', meaning: 'Digit grouping follows the locale, including lakh and crore (12,34,567).' },
  sign: { label: 'Sign and word', meaning: 'A negative or a change is carried by a sign, a shape or a word, never by colour alone.' },
  spoken: { label: 'Screen-reader output', meaning: 'What a screen reader announces is exact and names the currency or direction.' },
  axe: { label: 'axe clean', meaning: 'No serious or critical axe-core violations when rendered (colour contrast is checked in the browser pass).' },
};

export interface Claim { id: GuaranteeId; /** What exactly is promised, in one sentence. */ claim: string }
export interface NotClaimed { id: GuaranteeId; reason: string }

export interface ConformanceCard {
  /** The key the test uses for its proofs. */
  key: 'MoneyDisplay' | 'Figure' | 'Delta' | 'PriceChange' | 'CurrencyInput';
  /** The docs page slug. */
  page: string;
  summary: string;
  claims: readonly Claim[];
  notClaimed: readonly NotClaimed[];
}

export const CARDS: readonly ConformanceCard[] = [
  {
    key: 'MoneyDisplay',
    page: 'money-display',
    summary: 'One exact amount from bigint minor units, in any currency.',
    claims: [
      { id: 'exact', claim: 'A value past 2^53 prints every digit, and the <data> value attribute holds the exact decimal.' },
      { id: 'rounding', claim: 'Never rounds. Only the opt-in compact mode shortens, and it keeps the exact amount in the spoken text.' },
      { id: 'grouping', claim: 'The Nepal preset groups in lakh and crore (12,34,567.89); the locale decides otherwise.' },
      { id: 'sign', claim: 'A negative amount carries a minus or accounting parentheses in the text, plus a data-sign attribute.' },
      { id: 'spoken', claim: 'A shared symbol ($, A$) is spoken as the full currency name; a missing value is "No value", never zero.' },
      { id: 'axe', claim: 'No serious axe violations.' },
    ],
    notClaimed: [],
  },
  {
    key: 'Figure',
    page: 'figure',
    summary: 'A number on a page; exact when given a Money value.',
    claims: [
      { id: 'exact', claim: 'A Money value past 2^53 prints exactly, through a decimal string and never a Number.' },
      { id: 'grouping', claim: 'Given a lakh and crore formatter, a Money value groups as 12,34,567.89.' },
      { id: 'sign', claim: 'A negative Money value prints its minus sign.' },
      { id: 'axe', claim: 'No serious axe violations.' },
    ],
    notClaimed: [
      { id: 'rounding', reason: 'A plain number is a display value and is rounded to dp; pass a Money value for exact amounts.' },
      { id: 'spoken', reason: 'Figure prints text only and adds no spoken words; use MoneyDisplay where the currency must be named.' },
    ],
  },
  {
    key: 'Delta',
    page: 'figure',
    summary: 'A change as sign, arrow, colour and a spoken word.',
    claims: [
      { id: 'exact', claim: 'A Money change past 2^53 prints exactly.' },
      { id: 'sign', claim: 'Up and down carry a + or - sign and an arrow shape; a change of zero is neutral with no arrow.' },
      { id: 'spoken', claim: 'The direction is spoken as a word (up, down, unchanged), in your language through words.' },
      { id: 'axe', claim: 'No serious axe violations.' },
    ],
    notClaimed: [
      { id: 'rounding', reason: 'A percent or number change is a float rounded to dp for display; only a Money change is exact.' },
      { id: 'grouping', reason: 'Grouping follows the formatter you pass; the default is Intl en.' },
    ],
  },
  {
    key: 'PriceChange',
    page: 'price-change',
    summary: 'The move between two prices: an exact amount and a display percent.',
    claims: [
      { id: 'exact', claim: 'The absolute change is bigint arithmetic and stays exact past 2^53.' },
      { id: 'sign', claim: 'Direction is a sign, an arrow shape and a word, never colour alone.' },
      { id: 'spoken', claim: 'A screen reader hears the direction word, then the amount without a sign.' },
      { id: 'axe', claim: 'No serious axe violations.' },
    ],
    notClaimed: [
      { id: 'rounding', reason: 'The percent is display-only, from percentageChange (a float); do not store it.' },
      { id: 'grouping', reason: 'Grouping follows the locale you pass.' },
    ],
  },
  {
    key: 'CurrencyInput',
    page: 'currency-input',
    summary: 'A money field that reports bigint minor units.',
    claims: [
      { id: 'exact', claim: 'Typing 9007199254740993.00 reports minorUnits 900719925474099300n.' },
      { id: 'rounding', claim: 'A digit past the currency decimals is refused, never rounded (JPY takes none, KWD takes three).' },
      { id: 'grouping', claim: 'Digits regroup as you type, in lakh and crore for en-IN.' },
      { id: 'spoken', claim: 'The label is followed by the currency name for screen readers.' },
      { id: 'axe', claim: 'No serious axe violations.' },
    ],
    notClaimed: [
      { id: 'sign', reason: 'A negative amount is not offered by default; allowNegative accepts a leading minus only.' },
    ],
  },
];
