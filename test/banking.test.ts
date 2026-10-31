import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  accountNumberTail, formatAccountNumber, formatIban, formatTimestamp, formatTransactionReference, isValidIban, maskAccountNumber, spokenAccountNumber, transactionsToCsv,
} from '../src/banking/banking.ts';
import { exampleIban, transactions } from '../fixtures/banking-data.ts';
import { NUM_RUNS } from './fc.ts';

describe('maskAccountNumber', () => {
  it('keeps the last four and hides the rest', () => {
    expect(maskAccountNumber('0123456789012345')).toBe('••••••••••••2345');
    expect(maskAccountNumber('0123 4567 8901 2345', { groupSize: 4 })).toBe('•••• •••• •••• 2345');
  });
  it('never reveals more than asked, nor more than half the number', () => {
    expect(maskAccountNumber('0123456789', { visible: 2 })).toBe('••••••••89');
    expect(maskAccountNumber('1234')).toBe('••34');
    expect(maskAccountNumber('12')).toBe('•2');
    expect(maskAccountNumber('1')).toBe('•');
    expect(maskAccountNumber('1234567890', { visible: 0 })).toBe('••••••••••');
    expect(maskAccountNumber('1234567890', { visible: -3 })).toBe('••••••••••');
    expect(maskAccountNumber('1234567890', { visible: Number.NaN })).toBe('••••••7890');
  });
  it('handles odd input without throwing', () => {
    for (const odd of ['', '   ', null, undefined, 42, {}, '‮\u0000']) expect(maskAccountNumber(odd)).toBe('');
    expect(maskAccountNumber('ab-12.34_cd')).toBe('••••34cd');
  });
  it('property: output length equals the cleaned length and the revealed suffix is at most visible and half', () => {
    fc.assert(fc.property(fc.string(), fc.integer({ min: -2, max: 12 }), (input, visible) => {
      const raw = input.replaceAll('•', 'x');
      const clean = Array.from(raw.replace(/[\s\-_.]/g, '')).filter((c) => { const n = c.codePointAt(0)!; return !(n <= 0x1f || (n >= 0x7f && n <= 0x9f) || n === 0xad || (n >= 0x200b && n <= 0x200f) || (n >= 0x202a && n <= 0x202e) || (n >= 0x2060 && n <= 0x2069) || n === 0xfeff); });
      const out = Array.from(maskAccountNumber(raw, { visible }));
      expect(out.length).toBe(clean.length);
      const shown = out.filter((c) => c !== '•').length;
      expect(shown).toBeLessThanOrEqual(Math.max(0, Math.min(visible, Math.floor(clean.length / 2))));
    }), { numRuns: NUM_RUNS });
  });
  it('tail and spoken forms', () => {
    expect(accountNumberTail('0123456789012345')).toBe('2345');
    expect(accountNumberTail('12')).toBe('2');
    expect(accountNumberTail('1')).toBe('');
    expect(spokenAccountNumber('01234567')).toBe('0 1 2 3, 4 5 6 7');
  });
});

describe('formatAccountNumber', () => {
  it('groups', () => {
    expect(formatAccountNumber('0123456789012345')).toBe('0123 4567 8901 2345');
    expect(formatAccountNumber('0123456789', { groupSize: 3, separator: '-' })).toBe('012-345-678-9');
    expect(formatAccountNumber('12345', { groupSize: 0 })).toBe('12345');
    expect(formatAccountNumber(null)).toBe('');
  });
});

describe('IBAN', () => {
  it('validates the mod-97 check digits generically', () => {
    expect(isValidIban(exampleIban)).toBe(true);
    expect(isValidIban('de89370400440532013000')).toBe(true);
    expect(isValidIban('GB82 WEST 1234 5698 7654 33')).toBe(false);
    expect(isValidIban('GB82WEST12345698765')).toBe(false);
    expect(isValidIban('1234567890123456')).toBe(false);
    expect(isValidIban('')).toBe(false);
    expect(isValidIban(null)).toBe(false);
    expect(isValidIban('GB82 WEST 1234 5698 7654 32 99999999999999999')).toBe(false);
  });
  it('formats in blocks of four', () => {
    expect(formatIban('gb82west12345698765432')).toBe('GB82 WEST 1234 5698 7654 32');
  });
});

describe('formatTransactionReference', () => {
  it('removes control and bidi characters and collapses whitespace', () => {
    expect(formatTransactionReference('  FT25‮314  \n XK ')).toBe('FT25 314 XK');
    expect(formatTransactionReference('A​B')).toBe('A B');
    expect(formatTransactionReference(5)).toBe('');
  });
  it('groups and shortens from the middle', () => {
    expect(formatTransactionReference('ABCDEFGHIJKL', { groupSize: 4 })).toBe('ABCD EFGH IJKL');
    expect(formatTransactionReference('FT25314XK92Q4B7NLM3', { maxLength: 9 })).toBe('FT25…NLM3');
    expect(formatTransactionReference('SHORT', { maxLength: 9 })).toBe('SHORT');
  });
});

describe('formatTimestamp', () => {
  it('prints the instant in the named zone and says which', () => {
    expect(formatTimestamp('2025-11-10T10:42:05+05:45', { timeZone: 'Asia/Kathmandu' })?.text).toMatch(/10 Nov 2025.*10:42:05/);
    const utc = formatTimestamp('2025-11-10T10:42:05+05:45', { timeZone: 'UTC' });
    expect(utc?.text).toMatch(/04:57:05/);
    expect(utc?.iso).toBe('2025-11-10T04:57:05.000Z');
  });
  it('refuses a time with no offset, an invalid value, and falls back for an unknown zone', () => {
    expect(formatTimestamp('2025-11-10T10:42:05')).toBeNull();
    expect(formatTimestamp('nope')).toBeNull();
    expect(formatTimestamp(null)).toBeNull();
    expect(formatTimestamp(new Date(Number.NaN))).toBeNull();
    expect(formatTimestamp(0, { timeZone: 'Not/AZone' })?.text).toMatch(/UTC/);
  });
});

describe('transactionsToCsv', () => {
  it('writes exact decimals with the direction in words and neutralises formulas', () => {
    const csv = transactionsToCsv(transactions.slice(0, 5), { currency: 'NPR', balance: true, crlf: false });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Counterparty,Reference,Category,Direction,Amount,Status,Balance');
    expect(lines[1]).toBe('2025-11-14,Bhatbhateni Supermarket,POS240118842,Groceries,debit,-6845.75,completed,245180.75');
    expect(csv).toContain("\"'=HYPERLINK(");
    expect(csv).toContain("'@REV-0099");
    expect(lines.find((l) => l.includes('Salary'))).toContain(',65000.00,');
  });
  it('can turn neutralisation off and respects zero-decimal currencies', () => {
    const csv = transactionsToCsv([{ id: 'x', date: '2025-01-01', counterparty: '=1+1', amount: -500n, status: 'completed' }], { currency: 'JPY', neutralizeFormulas: false, crlf: false });
    expect(csv.split('\n')[1]).toBe('2025-01-01,=1+1,,,debit,-500,completed');
  });
});
