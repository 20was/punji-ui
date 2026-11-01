/**
 * Amount in words from a pack's number words: "रु. १,२३,४५६.५०" read as "एक लाख तेइस हजार चार सय छपन्न रुपैयाँ पचास
 * पैसा मात्र". Exact: bigint minor units, nothing passes through Number. Pure.
 */
import { amountInWords } from '../tax/words.ts';
import type { AmountWordsPack } from './types.ts';

export interface LocalAmountWordsOptions {
  /** Minor-unit digits. Default 2. */
  scale?: number;
}

/**
 * An amount in minor units in the pack's language, South Asian scales, unit names from `pack.currencies` (the ISO code
 * when the currency is not listed, and the minor part as "50/100"). Throws like `amountInWords` on a non-bigint.
 */
export function localAmountInWords(minorUnits: bigint, currency: string, pack: AmountWordsPack, options: LocalAmountWordsOptions = {}): string {
  const code = currency.toUpperCase();
  const units = pack.currencies[code];
  return amountInWords(minorUnits, {
    language: 'ne', numberWords: pack.numbers, scaleWords: pack.scales, minusWord: pack.minus, scale: options.scale ?? 2,
    major: units?.[0] ?? code, minor: units?.[1] ?? '', fractionAsDigits: !units?.[1], suffix: pack.suffix, unitPosition: 'after',
  });
}
