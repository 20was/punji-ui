import { describe, expect, it } from 'vitest';

import {
  DIGIT_SCRIPTS, areConfusable, createMoneyFormatter, currencyAmountInWords, currencyName, detectSpoofing, getIso4217, getIso4217ByNumeric,
  isIso4217Code, isoMinorUnits, listIso4217, parseLocalizedDecimal, parseNumber, secureFieldAttributes, skeleton, toAsciiDigits, toScriptDigits,
  amountInWords, integerInWords,
} from '../src/index.ts';

describe('detectSpoofing', () => {
  it('passes ordinary names in any one script', () => {
    for (const name of ['Ram Bahadur Thapa', 'राम बहाद\u0941र थापा', 'রহিম উদ\u09CDদিন', 'محمد علی', 'สมชาย ใจด\u0E35', 'José Núñez', '山田 Taro', "O'Brien-Smith"]) {
      expect(detectSpoofing(name).risk).toBe('none');
    }
  });
  it('keeps ZWJ and ZWNJ where Indic and Persian spelling needs them', () => {
    expect(detectSpoofing('क\u094D\u200Dष').risk).toBe('none');
    expect(detectSpoofing('می\u200Cخواهم').risk).toBe('none');
    const stray = detectSpoofing('Jo\u200Dhn');
    expect(stray.risk).toBe('high');
    expect(stray.display).toBe('John');
  });
  it('flags Latin mixed with look-alike Cyrillic or Greek letters', () => {
    const result = detectSpoofing('PаyPal');
    expect(result.risk).toBe('high');
    expect(result.scripts).toEqual(['Latin', 'Cyrillic']);
    expect(result.issues[0]).toMatchObject({ kind: 'confusable-characters', codePoints: ['U+0430'] });
    expect(detectSpoofing('Αlpha Bank').issues.map((i) => i.kind)).toContain('confusable-characters');
  });
  it('flags bidi controls and removes them from the display string', () => {
    const result = detectSpoofing('Ram\u202Etxt.exe');
    expect(result.risk).toBe('high');
    expect(result.issues[0]).toMatchObject({ kind: 'bidi-control', codePoints: ['U+202E'] });
    expect(result.display).toBe('Ramtxt.exe');
    expect(detectSpoofing('Sita\u200F').risk).toBe('review');
  });
  it('flags invisible and control characters', () => {
    expect(detectSpoofing('Jo\u200Bhn').issues[0]?.kind).toBe('invisible');
    expect(detectSpoofing('Jo\u0007hn').issues.map((i) => i.kind)).toContain('control');
  });
  it('notes mixed scripts, compatibility forms, stacked marks and odd spaces as review', () => {
    expect(detectSpoofing('Ramराम').issues[0]?.kind).toBe('mixed-script');
    expect(detectSpoofing('ｐａｙ').issues[0]?.kind).toBe('compatibility-form');
    expect(detectSpoofing('Ze\u0301\u0301\u0301\u0301\u0301').issues.map((i) => i.kind)).toContain('stacked-marks');
    expect(detectSpoofing(' Hari  Prasad').issues[0]?.kind).toBe('unusual-space');
    expect(detectSpoofing('Рома').issues[0]?.kind).toBe('whole-script-confusable');
    expect(detectSpoofing('Рома').risk).toBe('review');
  });
  it('catches a look-alike of a trusted name', () => {
    expect(detectSpoofing('Paypa1', { known: ['Paypal'] })).toMatchObject({ risk: 'high', lookalikeOf: 'Paypal' });
    expect(detectSpoofing('аррӏе', { known: ['apple'] }).lookalikeOf).toBe('apple');
    expect(detectSpoofing('Paypal', { known: ['Paypal'] }).risk).toBe('none');
  });
  it('builds a skeleton that folds look-alikes', () => {
    expect(skeleton('PаyPaI')).toBe('paypal');
    expect(skeleton('ｍodern')).toBe(skeleton('rnodern'));
    expect(areConfusable('Nabil Bank', 'NabiI Bank')).toBe(true);
    expect(areConfusable('Nabil Bank', 'Nabil Bank')).toBe(false);
    expect(() => detectSpoofing(42 as unknown as string)).toThrow(TypeError);
  });
});

describe('digits of every script', () => {
  it('normalises and renders the supported digit sets', () => {
    expect(toAsciiDigits('१२३ ১২৩ ١٢٣ ۱۲۳ ๑๒๓ ０１２')).toBe('123 123 123 123 123 012');
    expect(toScriptDigits('2026', 'beng')).toBe('২০২৬');
    expect(toScriptDigits('2026', 'thai')).toBe('๒๐๒๖');
    expect(() => toScriptDigits('1', 'xx')).toThrow(RangeError);
    expect(Object.keys(DIGIT_SCRIPTS)).toContain('arab');
  });
  it('agrees with Intl for each numbering system', () => {
    for (const [system, digits] of Object.entries(DIGIT_SCRIPTS)) {
      expect(new Intl.NumberFormat('en', { numberingSystem: system, useGrouping: false }).format(1234567890)).toBe([...'1234567890'].map((d) => digits[Number(d)]).join(''));
    }
  });
  it('accepts them in the decimal parsers', () => {
    expect(parseLocalizedDecimal('১২,৩৪৫.৫০')).toEqual({ state: 'valid', value: '12345.50' });
    expect(parseNumber('๑,๒๓๔.๕')).toBe(1234.5);
  });
});

describe('global money formatting', () => {
  it('formats 0, 2 and 3 decimal currencies exactly', () => {
    expect(createMoneyFormatter({ currency: 'JPY', locale: 'en' }).format(1234567n)).toBe('¥1,234,567');
    expect(createMoneyFormatter({ currency: 'USD', locale: 'en' }).format(123456789012345678901n)).toBe('$1,234,567,890,123,456,789.01');
    expect(createMoneyFormatter({ currency: 'KWD', locale: 'en' }).format(1234567n)).toBe('KWD\u00A01,234.567');
    expect(createMoneyFormatter({ currency: 'EUR', locale: 'de-DE' }).format(123456n)).toBe('1.234,56\u00A0€');
    expect(createMoneyFormatter({ currency: 'GBP', locale: 'en-GB' }).format(-5n)).toBe('-£0.05');
  });
  it('groups in lakh and crore for India and Bangladesh, and on request for Pakistan', () => {
    expect(createMoneyFormatter({ currency: 'INR', locale: 'en-IN' }).format(1234567890n)).toBe('₹1,23,45,678.90');
    const bd = createMoneyFormatter({ currency: 'BDT', locale: 'bn-BD' });
    expect(bd.southAsian).toBe(true);
    expect(bd.format(123456789n)).toBe('১২,৩৪,৫৬৭.৮৯৳');
    const pk = createMoneyFormatter({ currency: 'PKR', locale: 'en-PK', grouping: 'south-asian', exponent: 2 });
    expect(pk.format(123456789n)).toBe('Rs\u00A012,34,567.89');
    expect(pk.formatCompact(1234567800n)).toBe('Rs\u00A01.23\u00A0Cr');
    expect(pk.parse('12,34,567.89')).toEqual({ state: 'valid', value: '1234567.89', minor: 123456789n });
    expect(createMoneyFormatter({ currency: 'LKR', locale: 'en-LK' }).format(123456789n)).toBe('LKR\u00A01,234,567.89');
    const np = createMoneyFormatter({ currency: 'NPR', locale: 'en-NP', display: 'none' });
    expect(np.format(123456789n)).toBe('12,34,567.89');
    expect(np.parse('12,34,567.89')).toMatchObject({ state: 'valid', minor: 123456789n });
    expect(createMoneyFormatter({ currency: 'INR', locale: 'en-IN', grouping: 'western' }).format(123456789n)).toBe('₹1,234,567.89');
  });
  it('round-trips Arabic-Indic, Bengali and Thai digits', () => {
    for (const config of [{ currency: 'KWD', locale: 'ar-KW' }, { currency: 'BDT', locale: 'bn-BD' }, { currency: 'THB', locale: 'th-TH', numberingSystem: 'thai' }]) {
      const f = createMoneyFormatter({ ...config, display: 'none' });
      expect(f.parse(f.format(123456789n))).toMatchObject({ state: 'valid', minor: 123456789n });
    }
  });
  it('compacts exactly, rounding once from the decimal string', () => {
    const usd = createMoneyFormatter({ currency: 'USD', locale: 'en' });
    expect(usd.formatCompact(99999999n)).toBe('$1M');
    expect(usd.formatCompact(99999499n)).toBe('$999.99K');
    expect(usd.formatCompact(123456789012345678901n)).toBe('$1,234,567.89T');
    expect(usd.formatCompact(-125000000n)).toBe('-$1.25M');
    expect(createMoneyFormatter({ currency: 'NPR', locale: 'en-IN' }).formatCompact(1234567800n)).toBe('NPR\u00A01.23\u00A0Cr');
  });
  it('takes an exponent override and refuses a bad one', () => {
    expect(createMoneyFormatter({ currency: 'IQD', locale: 'en', exponent: 3 }).format(1234567n)).toBe('IQD\u00A01,234.567');
    expect(() => createMoneyFormatter({ currency: 'USD', exponent: 12 })).toThrow(RangeError);
  });
});

describe('ISO 4217 data', () => {
  it('knows the active currencies with numeric codes and minor units', () => {
    expect(getIso4217('npr')).toEqual({ code: 'NPR', numeric: '524', minorUnits: 2 });
    expect(getIso4217('KWD')?.minorUnits).toBe(3);
    expect(getIso4217('JPY')?.minorUnits).toBe(0);
    expect(getIso4217('UYW')?.minorUnits).toBe(4);
    expect(getIso4217ByNumeric(840)?.code).toBe('USD');
    expect(getIso4217ByNumeric('008')?.code).toBe('ALL');
    expect(isIso4217Code('HRK')).toBe(false);
    expect(isIso4217Code('BGN')).toBe(false);
    expect(() => isoMinorUnits('XXX')).toThrow(RangeError);
    expect(currencyName('NPR')).toBe('Nepalese Rupee');
  });
  it('has unique codes and numbers, sorted, and agrees with Intl except where CLDR drops a minor unit', () => {
    const all = listIso4217();
    expect(all.length).toBeGreaterThan(150);
    expect(new Set(all.map((c) => c.numeric)).size).toBe(all.length);
    expect(all.map((c) => c.code)).toEqual(all.map((c) => c.code).toSorted());
    const differ = all.filter((c) => {
      try { return new Intl.NumberFormat('en', { style: 'currency', currency: c.code }).resolvedOptions().maximumFractionDigits !== c.minorUnits; } catch { return true; }
    }).map((c) => c.code);
    // CLDR shows these with fewer decimals than ISO (coins out of use), or does not know them yet.
    for (const code of differ) expect(['AFN', 'ALL', 'COP', 'HUF', 'IDR', 'IQD', 'IRR', 'KPW', 'LAK', 'LBP', 'MGA', 'MMK', 'PKR', 'RSD', 'SOS', 'SYP', 'YER', 'UYW', 'VED', 'TWD', 'CLP', 'ISK', 'UGX', 'XCG', 'ZWG', 'SLE']).toContain(code);
  });
});

describe('amounts in words for any currency', () => {
  it('reads international scales', () => {
    expect(integerInWords(1_234_567_890n, { system: 'international' })).toBe('one billion two hundred thirty-four million five hundred sixty-seven thousand eight hundred ninety');
    expect(() => integerInWords(1n, { system: 'international', language: 'ne' })).toThrow(RangeError);
    expect(amountInWords(1050n, { fractionAsDigits: true })).toBe('Rupees Ten and 50/100 Only');
  });
  it('names the units of common and other currencies', () => {
    expect(currencyAmountInWords(125050n, 'USD')).toBe('One Thousand Two Hundred Fifty Dollars and Fifty Cents Only');
    expect(currencyAmountInWords(1234567n, 'JPY')).toBe('One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven Yen Only');
    expect(currencyAmountInWords(1234567n, 'KWD')).toBe('One Thousand Two Hundred Thirty-Four Dinars and Five Hundred Sixty-Seven Fils Only');
    expect(currencyAmountInWords(123456789n, 'NPR')).toBe('Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven Rupees and Eighty-Nine Paisa Only');
    expect(currencyAmountInWords(1050n, 'BRL')).toBe('Ten Brazilian Reals and 50/100 Only');
    expect(currencyAmountInWords(500n, 'GBP', { case: 'sentence', suffix: '' })).toBe('Five pounds');
    expect(() => currencyAmountInWords(1n, 'US')).toThrow(RangeError);
  });
});

describe('secureFieldAttributes', () => {
  it('maps each kind to the right autofill token and keyboard', () => {
    expect(secureFieldAttributes('current-password')).toMatchObject({ type: 'password', autoComplete: 'current-password', masked: true });
    expect(secureFieldAttributes('new-password').autoComplete).toBe('new-password');
    expect(secureFieldAttributes('one-time-code')).toMatchObject({ autoComplete: 'one-time-code', inputMode: 'numeric', masked: false });
    expect(secureFieldAttributes('cc-csc')).toMatchObject({ autoComplete: 'cc-csc', masked: true });
    expect(secureFieldAttributes('account-number').autoComplete).toBe('off');
    for (const kind of ['pin', 'cc-number', 'cc-exp', 'secret-answer'] as const) expect(secureFieldAttributes(kind).spellCheck).toBe(false);
    expect(() => secureFieldAttributes('email' as never)).toThrow(RangeError);
  });
});
