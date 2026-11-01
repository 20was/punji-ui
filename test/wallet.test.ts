import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  EMV_QR_MAX_LENGTH, buildMerchantQr, crc16Ccitt, encodeTlv, parseMerchantQr, parseTlv, verifyMerchantQrCrc, type MerchantQrInput,
} from '../src/emvco-qr/emvco.ts';
import { encodeQr, qrSvgPath } from '../src/qr-code/matrix.ts';
import {
  NEPAL_MOBILE_OPERATORS, detectNepalOperator, formatNepalMobile, isValidNepalMobile, normalizeNepalMobile, parseNepalMobile, type MobileOperator,
} from '../src/nepal/mobile.ts';
import { shuffleDigits } from '../src/pin-pad/PinPad.tsx';
import { NUM_RUNS } from './fc.ts';

// The worked example from the EMVCo MPM specification (v1.1, Appendix A), CRC A13A, with Chinese text in template 64.
const EMV_SPEC_SAMPLE = '00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A';

const merchant: MerchantQrInput = {
  merchantAccounts: [{ id: '26', guid: 'np.com.example', fields: { '01': 'M1234567' } }],
  merchantName: 'Himalayan Momo',
  merchantCity: 'Kathmandu',
};

describe('crc16Ccitt', () => {
  it('matches the CRC-16/CCITT-FALSE check value', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1');
    expect(crc16Ccitt('')).toBe('FFFF');
  });
});

describe('TLV', () => {
  it('encodes id, two-digit length and value, counting code points', () => {
    expect(encodeTlv('59', 'Himalayan Momo')).toBe('5914Himalayan Momo');
    expect(encodeTlv('01', 'नेपाल')).toBe('0105नेपाल');
    expect(() => encodeTlv('5', 'x')).toThrow(RangeError);
    expect(() => encodeTlv('59', '')).toThrow(RangeError);
    expect(() => encodeTlv('59', 'x'.repeat(100))).toThrow(RangeError);
  });
  it('parses nested templates and refuses truncated input', () => {
    const objects = parseTlv('26180014np.com.example5303524');
    expect(objects[0]).toMatchObject({ id: '26', children: [{ id: '00', value: 'np.com.example' }] });
    expect(objects[1]).toEqual({ id: '53', value: '524' });
    expect(() => parseTlv('5910short')).toThrow(SyntaxError);
    expect(() => parseTlv('ab02xx')).toThrow(SyntaxError);
  });
});

describe('parseMerchantQr', () => {
  it('reads the EMVCo specification example, in any object order', () => {
    const result = parseMerchantQr(EMV_SPEC_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      pointOfInitiation: 'dynamic', merchantCategoryCode: '4111', currencyNumeric: '156', currency: null, amount: 2372n, amountText: '23.72',
      tip: { type: 'prompt' }, countryCode: 'CN', merchantName: 'BEST TRANSPORT', merchantCity: 'BEIJING',
      alternateLanguage: { language: 'ZH', merchantName: '最佳运输', merchantCity: '北京' },
      additionalData: { storeLabel: '1234', customerLabel: '***', terminalLabel: 'A6008667', consumerDataRequest: 'ME' },
    });
    expect(result.value.merchantAccounts.map((a) => [a.id, a.guid])).toEqual([['29', 'D15600000000'], ['31', 'D15600000001']]);
  });
  it('reports each kind of bad payload without throwing', () => {
    expect(parseMerchantQr('   ')).toMatchObject({ ok: false, code: 'empty' });
    expect(parseMerchantQr('https://example.com')).toMatchObject({ ok: false, code: 'malformed' });
    expect(parseMerchantQr(EMV_SPEC_SAMPLE.replace('BEST', 'BEST'.toLowerCase()))).toMatchObject({ ok: false, code: 'crc' });
    expect(parseMerchantQr('000201')).toMatchObject({ ok: false, code: 'malformed' });
    const noAccount = '0002010102115204000053035245802NP5904Shop6304';
    expect(parseMerchantQr(noAccount + crc16Ccitt(noAccount))).toMatchObject({ ok: false, code: 'missing' });
    const badAmount = '00020101021226180014np.com.example52040000530352454041.2.5802NP5904Shop6003KTM6304';
    expect(parseMerchantQr(badAmount + crc16Ccitt(badAmount))).toMatchObject({ ok: false, code: 'amount' });
    const tooPrecise = '00020101021226180014np.com.example520400005303524540612.3455802NP5904Shop6003KTM6304';
    expect(parseMerchantQr(tooPrecise + crc16Ccitt(tooPrecise))).toMatchObject({ ok: false, code: 'amount' });
    expect(parseMerchantQr('9'.repeat(EMV_QR_MAX_LENGTH + 1))).toMatchObject({ ok: false, code: 'malformed' });
  });
  it('accepts a lower-case CRC', () => {
    const payload = buildMerchantQr(merchant);
    expect(verifyMerchantQrCrc(payload.slice(0, -4) + payload.slice(-4).toLowerCase())).toBe(true);
    expect(verifyMerchantQrCrc('nothing')).toBe(false);
  });
});

describe('buildMerchantQr', () => {
  it('builds a static NPR payload with the mandatory objects and a valid CRC', () => {
    const payload = buildMerchantQr(merchant);
    expect(payload).toBe(`00020101021126300014np.com.example0108M12345675204000053035245802NP5914Himalayan Momo6009Kathmandu6304${payload.slice(-4)}`);
    expect(verifyMerchantQrCrc(payload)).toBe(true);
  });
  it('makes a dynamic code with an exact amount from minor units', () => {
    const payload = buildMerchantQr({ ...merchant, amount: 125050n, additionalData: { billNumber: 'INV-42', terminalLabel: 'T2' } });
    expect(payload).toContain('010212');
    expect(payload).toContain('54071250.50');
    expect(payload).toContain('62160106INV-420702T2');
    const parsed = parseMerchantQr(payload);
    expect(parsed.ok && parsed.value.amount).toBe(125050n);
    expect(parsed.ok && parsed.value.currency).toBe('NPR');
  });
  it('round-trips every field', () => {
    const input: MerchantQrInput = {
      ...merchant, amount: 99n, currency: '356', merchantCategoryCode: '5812', countryCode: 'IN', postalCode: '44600',
      tip: { type: 'fixed', fee: 1000n }, alternateLanguage: { language: 'ne', merchantName: 'हिमालयन मम', merchantCity: 'काठमाडौं' },
      additionalData: { mobileNumber: '9841234567', purpose: 'Lunch', consumerDataRequest: 'M' }, extra: [{ id: '80', value: 'abc' }],
    };
    const parsed = parseMerchantQr(buildMerchantQr(input));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({
      amount: 99n, amountText: '0.99', currency: 'INR', merchantCategoryCode: '5812', countryCode: 'IN', postalCode: '44600',
      tip: { type: 'fixed', fee: 1000n }, alternateLanguage: input.alternateLanguage, additionalData: input.additionalData,
    });
    expect(parsed.value.objects.find((o) => o.id === '80')?.value).toBe('abc');
  });
  it('refuses what the format cannot carry instead of truncating', () => {
    expect(() => buildMerchantQr({ ...merchant, merchantName: 'x'.repeat(26) })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, merchantCity: 'x'.repeat(16) })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, amount: 0n })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, amount: -5n })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, amount: 10n ** 13n })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, currency: 'EUR' })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, currency: '978' })).toThrow(RangeError);
    expect(buildMerchantQr({ ...merchant, currency: '978', exponent: 2, amount: 5n })).toContain('530397854040.05');
    expect(() => buildMerchantQr({ ...merchant, merchantAccounts: [] })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, merchantAccounts: [{ id: '52', value: 'x' }] })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, merchantAccounts: [{ id: '26' }] })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, merchantCategoryCode: '12' })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, tip: { type: 'percentage', percent: '0' } })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, tip: { type: 'percentage', percent: '101' } })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, additionalData: { consumerDataRequest: 'MM' } })).toThrow(RangeError);
    expect(() => buildMerchantQr({ ...merchant, extra: [{ id: '62', value: 'x' }] })).toThrow(RangeError);
  });
  it('property: any amount and name round-trips exactly', () => {
    expect(() => fc.assert(fc.property(
      fc.bigInt({ min: 1n, max: 9_999_999_999_99n }),
      fc.string({ minLength: 1, maxLength: 25, unit: fc.constantFrom(...'abcXYZ 0123-&.नेपाल') }).filter((s) => s.trim().length > 0),
      (amount, name) => {
        const parsed = parseMerchantQr(buildMerchantQr({ ...merchant, merchantName: name, amount }));
        return parsed.ok && parsed.value.amount === amount && parsed.value.merchantName === name;
      },
    ), { numRuns: NUM_RUNS })).not.toThrow();
  });
});

/** FNV-1a over the rows as '0'/'1' lines, for comparing a grid with a reference encoder. */
function fingerprint(modules: readonly (readonly boolean[])[]): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(modules.map((row) => row.map((m) => (m ? '1' : '0')).join('')).join('\n'))) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

describe('encodeQr', () => {
  // Reference grids from segno 1.6.6 (byte mode, same version, level and mask, segno's extra pad byte removed).
  it('matches a reference encoder bit for bit (version 1)', () => {
    const qr = encodeQr('hello', { errorCorrection: 'M', mask: 0, boostErrorCorrection: false });
    expect(qr.version).toBe(1);
    expect(qr.modules.map((row) => parseInt(row.map((m) => (m ? '1' : '0')).join(''), 2).toString(16).padStart(6, '0'))).toEqual([
      '1fcc7f', '105841', '174b5d', '17465d', '17595d', '104141', '1fd57f', '000700', '154a12', '058443', '0a5d1f',
      '190042', '0d6550', '001ea7', '1fc6e7', '1047b0', '1756e3', '174866', '175d15', '104852', '1fdd63',
    ]);
  });
  it('matches a reference encoder for multi-block codes, version information and UTF-8', () => {
    expect([encodeQr('x'.repeat(200), { errorCorrection: 'Q', mask: 3, boostErrorCorrection: false })].map((q) => [q.version, fingerprint(q.modules)])).toEqual([[12, '5a71825e']]);
    expect([encodeQr('नेपाल पेमेन्ट', { errorCorrection: 'H', mask: 5, boostErrorCorrection: false })].map((q) => [q.version, fingerprint(q.modules)])).toEqual([[5, 'a67384ee']]);
    expect([encodeQr('A1b2'.repeat(300), { errorCorrection: 'L', mask: 6, boostErrorCorrection: false })].map((q) => [q.version, fingerprint(q.modules)])).toEqual([[25, '439b4a68']]);
  });
  it('picks the smallest version and boosts error correction when it fits', () => {
    expect(encodeQr('x'.repeat(14), { boostErrorCorrection: false })).toMatchObject({ version: 1, errorCorrection: 'M' });
    expect(encodeQr('x'.repeat(15), { boostErrorCorrection: false }).version).toBe(2);
    expect(encodeQr('hi')).toMatchObject({ version: 1, errorCorrection: 'H' });
    expect(encodeQr('x'.repeat(213), { errorCorrection: 'M', boostErrorCorrection: false }).version).toBe(10);
    expect(encodeQr('x'.repeat(2953), { errorCorrection: 'L' })).toMatchObject({ version: 40, size: 177 });
    expect(() => encodeQr('x'.repeat(2954), { errorCorrection: 'L' })).toThrow(RangeError);
    expect(() => encodeQr('x'.repeat(100), { maxVersion: 2 })).toThrow(RangeError);
    expect(encodeQr('x', { minVersion: 7 }).version).toBe(7);
  });
  it('draws the finder and timing patterns', () => {
    const { modules, size } = encodeQr(buildMerchantQr(merchant));
    const finder = ['1111111', '1000001', '1011101', '1011101', '1011101', '1000001', '1111111'];
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]] as const) {
      expect(finder.map((row, y) => row.split('').map((_, x) => (modules[oy + y]![ox + x] ? '1' : '0')).join(''))).toEqual(finder);
    }
    for (let i = 8; i < size - 8; i++) {
      expect(modules[6]![i]).toBe(i % 2 === 0);
      expect(modules[i]![6]).toBe(i % 2 === 0);
    }
    expect(modules[size - 8]![8]).toBe(true);
  });
  it('validates options', () => {
    expect(() => encodeQr('x', { errorCorrection: 'X' as 'L' })).toThrow(RangeError);
    expect(() => encodeQr('x', { minVersion: 0 })).toThrow(RangeError);
    expect(() => encodeQr('x', { mask: 8 })).toThrow(RangeError);
  });
  it('qrSvgPath merges runs and offsets by the quiet zone', () => {
    const matrix = { version: 1, size: 3, errorCorrection: 'M' as const, mask: 0, modules: [[true, true, false], [false, false, false], [false, false, true]] };
    expect(qrSvgPath(matrix, 1)).toBe('M1 1h2v1h-2zM3 3h1v1h-1z');
  });
});

describe('Nepal mobile numbers', () => {
  it('normalises country codes, separators and Devanagari digits', () => {
    expect(normalizeNepalMobile('+977 984-123 4567')).toBe('9841234567');
    expect(normalizeNepalMobile('00977 9801234567')).toBe('9801234567');
    expect(normalizeNepalMobile('9779611234567')).toBe('9611234567');
    expect(normalizeNepalMobile('९८४१२३४५६७')).toBe('9841234567');
    expect(normalizeNepalMobile('09841234567')).toBe('9841234567');
  });
  it('detects the operator from the prefix table', () => {
    expect(detectNepalOperator('984')?.id).toBe('ntc');
    expect(detectNepalOperator('9761234567')?.id).toBe('ntc');
    expect(detectNepalOperator('+977 980')?.id).toBe('ncell');
    expect(detectNepalOperator('9701234567')?.id).toBe('ncell');
    expect(detectNepalOperator('988')?.id).toBe('smartcell');
    expect(detectNepalOperator('98')).toBeNull();
    expect(detectNepalOperator('990')).toBeNull();
    const custom: MobileOperator[] = [{ id: 'new', name: 'New Mobile', shortName: 'New', prefixes: ['990'] }];
    expect(detectNepalOperator('990', custom)?.id).toBe('new');
  });
  it('parses partial, valid and invalid numbers with a reason', () => {
    expect(parseNepalMobile('')).toMatchObject({ state: 'empty', reason: null });
    expect(parseNepalMobile('98')).toMatchObject({ state: 'partial', operator: null });
    expect(parseNepalMobile('9841')).toMatchObject({ state: 'partial', operator: { id: 'ntc' } });
    expect(parseNepalMobile('9841234567')).toMatchObject({ state: 'valid', e164: '+9779841234567', operator: { id: 'ntc' } });
    expect(parseNepalMobile('98412345678')).toMatchObject({ state: 'invalid', reason: 'length' });
    expect(parseNepalMobile('8841234567')).toMatchObject({ state: 'invalid', reason: 'start' });
    expect(parseNepalMobile('9901234567')).toMatchObject({ state: 'invalid', reason: 'prefix' });
    expect(parseNepalMobile('9901234567', { allowUnknownPrefix: true })).toMatchObject({ state: 'valid', operator: null });
    expect(parseNepalMobile('98a')).toMatchObject({ state: 'invalid', reason: 'characters' });
    expect(parseNepalMobile('+97')).toMatchObject({ state: 'partial' });
    expect(parseNepalMobile('97798')).toMatchObject({ state: 'partial' });
    expect(isValidNepalMobile('+977-9851234567')).toBe(true);
    expect(isValidNepalMobile('985123456')).toBe(false);
  });
  it('formats as prefix-subscriber, optionally international or in Devanagari', () => {
    expect(formatNepalMobile('9841234567')).toBe('984-1234567');
    expect(formatNepalMobile('98412')).toBe('984-12');
    expect(formatNepalMobile('98')).toBe('98');
    expect(formatNepalMobile('9841234567', { international: true, separator: ' ' })).toBe('+977 984 1234567');
    expect(formatNepalMobile('9841234567', { digits: 'deva' })).toBe('९८४-१२३४५६७');
  });
  it('keeps every prefix unique across operators', () => {
    const all = NEPAL_MOBILE_OPERATORS.flatMap((o) => o.prefixes);
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((p) => /^9\d\d$/.test(p))).toBe(true);
  });
});

describe('shuffleDigits', () => {
  it('is a permutation of the ten digits for any random source', () => {
    expect(() => fc.assert(fc.property(fc.array(fc.double({ min: 0, max: 0.999_999, noNaN: true }), { minLength: 9, maxLength: 9 }), (values) => {
      let i = 0;
      const out = shuffleDigits(() => values[i++]!);
      return out.toSorted().join('') === '0123456789';
    }))).not.toThrow();
  });
  it('uses crypto by default', () => {
    expect(shuffleDigits().toSorted().join('')).toBe('0123456789');
  });
});
