import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { NUM_RUNS } from './fc.ts';

import {
  CARD_BRANDS, IBAN_FORMATS, NEPAL_BANK_ACCOUNT_DEFAULT, abaChecksumValid, compactPaymentInput, detectCardBrand, formatCardNumber,
  formatIbanGroups, ibanCheckDigits, ibanLength, luhnValid, maskCardNumber, mod97, parseAbaRouting, parseBic, parseCardCvc,
  parseCardExpiry, parseCardNumber, parseIban, parseIfsc, parseNepalBankAccount, parseSortCode, parseUkAccountNumber, parseUpiVpa,
  stripInvisible,
} from '../src/payments/payments.ts';

// Example IBANs as published in the SWIFT IBAN registry and national banking associations.
const IBANS = [
  'GB82WEST12345698765432', 'DE89370400440532013000', 'FR1420041010050500013M02606', 'NL91ABNA0417164300', 'BE68539007547034',
  'CH9300762011623852957', 'ES9121000418450200051332', 'IT60X0542811101000000123456', 'AT611904300234573201', 'NO9386011117947',
  'SA0380000000608010167519', 'AE070331234567890123456', 'PL61109010140000071219812874', 'SE4550000000058398257466',
  'IE29AIBK93115212345678', 'DK5000400440116243', 'FI2112345600000785', 'GR1601101250000000012300695', 'HR1210010051863000160',
  'CZ6508000000192000145399', 'SK3112000000198742637541', 'LT121000011101001000', 'LU280019400644750000', 'SI56263300012039086',
  'MT84MALT011000012345MTLCAST001S', 'CY17002001280000001200527600', 'BG80BNBG96611020345678', 'EE382200221020145685',
  'HU42117730161111101800000000', 'PT50000201231234567890154', 'IS140159260076545510730339', 'TR330006100519786457841326',
  'IL620108000000099999999', 'MU17BOMM0101101030300200000MUR', 'BR1800360305000010009795493C1', 'RO49AAAA1B31007593840000',
  'LV80BANK0000435195001', 'LI21088100002324013AA', 'MC5811222000010123456789030', 'SM86U0322509800000000270100',
  'AD1200012030200359100100', 'GI75NWBK000000007099453', 'ME25505000012345678951', 'RS35260005601001611379', 'BA391290079401028494',
  'AL47212110090000000235698741', 'KW81CBKU0000000000001234560101', 'JO94CBJO0010000000000131000302', 'QA58DOHB00001234567890ABCDEFG',
  'PK36SCBL0000001123456702', 'XK051212012345678906', 'TN5910006035183598478831', 'GE29NB0000000101904917', 'MK07250120000058984',
];

const runs = { numRuns: NUM_RUNS };

describe('normalising pasted input', () => {
  it('reads Devanagari and Bengali digits, drops separators and invisible characters', () => {
    expect(compactPaymentInput('१२३४-५६ ৭৮').text).toBe('12345678');
    expect(compactPaymentInput('gb82​west').text).toBe('GB82WEST');
    expect(compactPaymentInput('gb82​west').cleaned).toBe(true);
    expect(stripInvisible('a‮b').text).toBe('ab');
  });
});

describe('IBAN', () => {
  it.each(IBANS)('accepts the registry example %s', (iban) => {
    const result = parseIban(iban);
    expect(result.state).toBe('valid');
    expect(result.length).toBe(iban.length);
  });

  it('derives every country length from the BBAN structure', () => {
    expect(ibanLength('GB')).toBe(22);
    expect(ibanLength('NO')).toBe(15);
    expect(ibanLength('RU')).toBe(33);
    expect(ibanLength('US')).toBeNull();
    for (const country of Object.keys(IBAN_FORMATS)) expect(ibanLength(country)).toBeGreaterThanOrEqual(15);
  });

  it('is paste-tolerant and groups for display', () => {
    const result = parseIban(' iban gb82-west-1234-5698-7654-32 ');
    expect(result).toMatchObject({ state: 'valid', value: 'GB82WEST12345698765432', display: 'GB82 WEST 1234 5698 7654 32', country: 'GB' });
    expect(formatIbanGroups('de8937040044')).toBe('DE89 3704 0044');
  });

  it('explains what is wrong', () => {
    expect(parseIban('GB82WEST12345698765433')).toMatchObject({ state: 'invalid', reason: 'checksum' });
    expect(parseIban('GB82WEST1234')).toMatchObject({ state: 'partial' });
    expect(parseIban('GB82WEST123456987654321')).toMatchObject({ state: 'invalid', reason: 'length' });
    expect(parseIban('US12345678901234')).toMatchObject({ state: 'invalid', reason: 'country' });
    expect(parseIban('GB82W3ST12345698765432')).toMatchObject({ state: 'invalid', reason: 'format' });
    expect(parseIban('GB8!')).toMatchObject({ state: 'invalid', reason: 'characters' });
    expect(parseIban('DE89370400440532013000', { countries: ['FR'] })).toMatchObject({ state: 'invalid', reason: 'country' });
    expect(parseIban('')).toMatchObject({ state: 'empty' });
  });

  it('computes check numbers that validate (property)', () => {
    fc.assert(fc.property(fc.stringMatching(/^\d{8}$/), fc.stringMatching(/^\d{10}$/), (blz, account) => {
      const bban = blz + account;
      expect(parseIban(`DE${ibanCheckDigits('DE', bban)}${bban}`).state).toBe('valid');
    }), runs);
  });

  it('catches every single-character substitution in a valid IBAN (property)', () => {
    fc.assert(fc.property(fc.constantFrom(...IBANS), fc.nat(), fc.integer({ min: 1, max: 9 }), (iban, at, delta) => {
      const index = 4 + (at % (iban.length - 4));
      const char = iban[index]!;
      if (!/\d/.test(char)) return;
      const changed = iban.slice(0, index) + String((Number(char) + delta) % 10) + iban.slice(index + 1);
      expect(parseIban(changed).state).toBe('invalid');
    }), runs);
  });

  it('mod97 agrees with BigInt arithmetic (property)', () => {
    fc.assert(fc.property(fc.stringMatching(/^[1-9]\d{0,40}$/), (digits) => {
      expect(mod97(digits)).toBe(Number(BigInt(digits) % 97n));
    }), runs);
  });
});

describe('card number', () => {
  it('detects brands by IIN range', () => {
    expect(detectCardBrand('4242')?.id).toBe('visa');
    expect(detectCardBrand('5555')?.id).toBe('mastercard');
    expect(detectCardBrand('2221 00')?.id).toBe('mastercard');
    expect(detectCardBrand('2720')?.id).toBe('mastercard');
    expect(detectCardBrand('3782')?.id).toBe('amex');
    expect(detectCardBrand('6011')?.id).toBe('discover');
    expect(detectCardBrand('3530')?.id).toBe('jcb');
    expect(detectCardBrand('3056')?.id).toBe('diners');
    expect(detectCardBrand('6200')?.id).toBe('unionpay');
    expect(detectCardBrand('6070')?.id).toBe('rupay');
    expect(detectCardBrand('2201')?.id).toBe('mir');
    expect(detectCardBrand('6759')?.id).toBe('maestro');
    expect(detectCardBrand('9999')).toBeNull();
  });

  it('validates the networks\' published test numbers', () => {
    for (const number of ['4242424242424242', '4000056655665556', '5555555555554444', '2223003122003222', '378282246310005', '6011111111111117', '3056930009020004', '3566002020360505']) {
      expect(parseCardNumber(number).state).toBe('valid');
    }
  });

  it('groups by brand and masks to the last four', () => {
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatCardNumber('४२४२४२४२४२४२४२४२')).toBe('4242 4242 4242 4242');
    expect(maskCardNumber('4242 4242 4242 4242')).toBe('•••• 4242');
    expect(maskCardNumber('4242')).toBe('••••');
  });

  it('explains what is wrong', () => {
    expect(parseCardNumber('4242424242424241')).toMatchObject({ state: 'partial', reason: 'checksum' });
    expect(parseCardNumber('4242424242424241000')).toMatchObject({ state: 'invalid', reason: 'checksum' });
    expect(parseCardNumber('99999999')).toMatchObject({ state: 'invalid', reason: 'brand' });
    expect(parseCardNumber('378282246310005', { accept: ['visa'] })).toMatchObject({ state: 'invalid', reason: 'brand' });
    expect(parseCardNumber('4242x')).toMatchObject({ state: 'invalid', reason: 'characters' });
  });

  it('Luhn accepts a number with its computed check number and rejects any single change (property)', () => {
    fc.assert(fc.property(fc.stringMatching(/^\d{11,18}$/), fc.nat(), fc.integer({ min: 1, max: 9 }), (body, at, delta) => {
      const check = [...'0123456789'].find((d) => luhnValid(body + d))!;
      const full = body + check;
      expect(luhnValid(full)).toBe(true);
      const index = at % full.length;
      const changed = full.slice(0, index) + String((Number(full[index]) + delta) % 10) + full.slice(index + 1);
      expect(luhnValid(changed)).toBe(false);
    }), runs);
  });

  it('never puts more than four digits in the masked form (property)', () => {
    fc.assert(fc.property(fc.stringMatching(/^\d{0,19}$/), (digits) => {
      expect((maskCardNumber(digits).match(/\d/g) ?? []).length).toBeLessThanOrEqual(4);
    }), runs);
  });

  it('every brand has its lengths and CVC length', () => {
    for (const brand of CARD_BRANDS) {
      expect(brand.lengths.length).toBeGreaterThan(0);
      expect([3, 4]).toContain(brand.cvcLength);
    }
  });
});

describe('expiry and CVC', () => {
  const today = { year: 2026, month: 11 };
  it('accepts common shapes', () => {
    expect(parseCardExpiry('12/28', { today })).toMatchObject({ state: 'valid', value: '12/28', display: '12 / 28', month: 12, year: 2028 });
    expect(parseCardExpiry('1228', { today })).toMatchObject({ state: 'valid', value: '12/28' });
    expect(parseCardExpiry('3/2029', { today })).toMatchObject({ state: 'valid', value: '03/29' });
    expect(parseCardExpiry('११/२६', { today })).toMatchObject({ state: 'valid' });
    expect(parseCardExpiry('4', { today })).toMatchObject({ state: 'partial', display: '04' });
  });
  it('refuses past, far-future and impossible dates', () => {
    expect(parseCardExpiry('10/26', { today })).toMatchObject({ state: 'invalid', reason: 'expired' });
    expect(parseCardExpiry('11/26', { today })).toMatchObject({ state: 'valid' });
    expect(parseCardExpiry('13/28', { today })).toMatchObject({ state: 'invalid', reason: 'month' });
    expect(parseCardExpiry('01/60', { today })).toMatchObject({ state: 'invalid', reason: 'too-far' });
  });
  it('CVC follows the brand', () => {
    const amex = detectCardBrand('37')!;
    expect(parseCardCvc('123', amex).state).toBe('partial');
    expect(parseCardCvc('1234', amex).state).toBe('valid');
    expect(parseCardCvc('1234', detectCardBrand('4')).state).toBe('invalid');
  });
});

describe('bank codes', () => {
  it('SWIFT/BIC', () => {
    expect(parseBic('deutdeff')).toMatchObject({ state: 'valid', value: 'DEUTDEFF', parts: { institution: 'DEUT', country: 'DE', location: 'FF', branch: null } });
    expect(parseBic('NARBNPKA')).toMatchObject({ state: 'valid' });
    expect(parseBic('DEUTDEFF500')).toMatchObject({ state: 'valid', display: 'DEUT DE FF 500' });
    expect(parseBic('DEUTZZFF')).toMatchObject({ state: 'invalid', reason: 'country' });
    expect(parseBic('DEU1')).toMatchObject({ state: 'invalid', reason: 'format' });
    expect(parseBic('DEUTDEFF5')).toMatchObject({ state: 'partial' });
  });
  it('IFSC', () => {
    expect(parseIfsc('sbin0001234')).toMatchObject({ state: 'valid', value: 'SBIN0001234' });
    expect(parseIfsc('SBIN1001234')).toMatchObject({ state: 'invalid', reason: 'format' });
    expect(parseIfsc('HDFC0')).toMatchObject({ state: 'partial' });
  });
  it('UPI VPA, including a pasted upi:// link', () => {
    expect(parseUpiVpa('Ram.Sharma@OKAXIS')).toMatchObject({ state: 'valid', value: 'ram.sharma@okaxis', handle: 'ram.sharma', provider: 'okaxis' });
    expect(parseUpiVpa('upi://pay?pa=shop%40ybl&pn=Shop&am=10')).toMatchObject({ state: 'valid', value: 'shop@ybl' });
    expect(parseUpiVpa('ram')).toMatchObject({ state: 'partial' });
    expect(parseUpiVpa('rаm@okaxis')).toMatchObject({ state: 'invalid', reason: 'characters' });
    expect(parseUpiVpa('ram@ok', { providers: ['okaxis'] })).toMatchObject({ state: 'partial' });
    expect(parseUpiVpa('ram@ybl', { providers: ['okaxis'] })).toMatchObject({ state: 'invalid', reason: 'provider' });
  });
  it('UK sort code and account number', () => {
    expect(parseSortCode('12 34 56')).toMatchObject({ state: 'valid', value: '123456', display: '12-34-56' });
    expect(parseSortCode('1234567')).toMatchObject({ state: 'invalid', reason: 'length' });
    expect(parseUkAccountNumber('31926819')).toMatchObject({ state: 'valid' });
    expect(parseUkAccountNumber('1234567')).toMatchObject({ state: 'partial' });
    expect(parseUkAccountNumber('1234567', { padShort: true })).toMatchObject({ state: 'valid', value: '01234567' });
  });
  it('US ABA routing number', () => {
    expect(parseAbaRouting('011000015')).toMatchObject({ state: 'valid' });
    expect(parseAbaRouting('021000021')).toMatchObject({ state: 'valid' });
    expect(parseAbaRouting('021000022')).toMatchObject({ state: 'invalid', reason: 'checksum' });
    expect(parseAbaRouting('45')).toMatchObject({ state: 'invalid', reason: 'format' });
    expect(abaChecksumValid('122105155')).toBe(true);
  });
  it('ABA catches every single-character change (property)', () => {
    fc.assert(fc.property(fc.stringMatching(/^\d{8}$/), fc.nat(8), fc.integer({ min: 1, max: 9 }), (body, index, delta) => {
      const last = [...'0123456789'].find((d) => abaChecksumValid(body + d))!;
      const full = body + last;
      const changed = full.slice(0, index) + String((Number(full[index]) + delta) % 10) + full.slice(index + 1);
      expect(abaChecksumValid(changed)).toBe(false);
    }), runs);
  });
  it('Nepal bank accounts follow the rule you pass', () => {
    expect(parseNepalBankAccount('०१०१ ०१७५ ००१२ ३४').state).toBe('valid');
    expect(parseNepalBankAccount('1234567').state).toBe('partial');
    expect(parseNepalBankAccount('ABC12345678').reason).toBe('characters');
    const rule = { id: 'example', name: 'Example Bank', lengths: [14], pattern: '^0\\d{2}', groups: [3, 4] };
    expect(parseNepalBankAccount('01234567890123', rule)).toMatchObject({ state: 'valid', display: '012 3456 7890 123' });
    expect(parseNepalBankAccount('11234567890123', rule)).toMatchObject({ state: 'invalid', reason: 'format' });
    expect(NEPAL_BANK_ACCOUNT_DEFAULT.lengths).toContain(14);
  });
  it('never throws on arbitrary input (property)', () => {
    fc.assert(fc.property(fc.string({ maxLength: 60 }), (text) => {
      for (const parse of [parseIban, parseCardNumber, parseCardExpiry, parseCardCvc, parseBic, parseIfsc, parseUpiVpa, parseSortCode, parseUkAccountNumber, parseAbaRouting, parseNepalBankAccount]) {
        const result = (parse as (t: string) => { state: string; value: string })(text);
        expect(['empty', 'partial', 'valid', 'invalid']).toContain(result.state);
      }
    }), runs);
  });
});
