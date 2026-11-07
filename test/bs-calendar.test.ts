import { describe, expect, it } from 'vitest';
import { BS_ANCHOR, BS_DATA_VERSION, BS_OFFICIAL_THROUGH, BS_TABLE_RANGE, BS_VERIFIED_RANGE, BS_YEARS } from '../src/nepal/bs-data.ts';
import { bsMonthLength, bsToEpochDay, epochDayToBs, epochDayToGregorian, gregorianToEpochDay } from '../src/nepal/bs-convert.ts';
import { bsToGregorian, gregorianToBS } from '../src/nepal/calendar.ts';
import type { CalendarDate } from '../src/nepal/date-only.ts';

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (bs: CalendarDate) => WEEKDAYS[(((bsToEpochDay(bs) + 4) % 7) + 7) % 7];

// Nepal Rajpatra Part 5 holiday notices (Home Ministry): every Saturday of every month, transcribed from the
// scans (docs/research/bs-calendar/README.md section 2.1). This is the evidence behind the "official" status.
const SATURDAYS: Record<number, number[][]> = {
  2080: [[2, 9, 16, 23, 30], [6, 13, 20, 27], [2, 9, 16, 23, 30], [6, 13, 20, 27], [2, 9, 16, 23, 30], [6, 13, 20, 27], [4, 11, 18, 25], [2, 9, 16, 23, 30], [7, 14, 21, 28], [6, 13, 20, 27], [5, 12, 19, 26], [3, 10, 17, 24]],
  2081: [[1, 8, 15, 22, 29], [5, 12, 19, 26], [1, 8, 15, 22, 29], [5, 12, 19, 26], [1, 8, 15, 22, 29], [5, 12, 19, 26], [3, 10, 17, 24], [1, 8, 15, 22, 29], [6, 13, 20, 27], [5, 12, 19, 26], [3, 10, 17, 24], [2, 9, 16, 23, 30]],
  2082: [[6, 13, 20, 27], [3, 10, 17, 24, 31], [7, 14, 21, 28], [3, 10, 17, 24, 31], [7, 14, 21, 28], [4, 11, 18, 25], [1, 8, 15, 22, 29], [6, 13, 20, 27], [5, 12, 19, 26], [3, 10, 17, 24], [2, 9, 16, 23, 30], [7, 14, 21, 28]],
  2083: [[5, 12, 19, 26], [2, 9, 16, 23, 30], [6, 13, 20, 27], [2, 9, 16, 23, 30], [6, 13, 20, 27], [3, 10, 17, 24, 31], [7, 14, 21, 28], [5, 12, 19, 26], [4, 11, 18, 25], [2, 9, 16, 23], [1, 8, 15, 22, 29], [6, 13, 20, 27]],
};
const BAISAKH_1: Record<number, string> = { 2080: 'Friday', 2081: 'Saturday', 2082: 'Monday', 2083: 'Tuesday' };
// Month lengths derived from the Saturdays above (length(m) = last Saturday(m) + 7 - first Saturday(m+1)).
const DERIVED: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30],
};
const record = (year: number) => BS_YEARS.find((r) => r.year === year)!;
const allBsDays = function* () {
  for (const r of BS_YEARS) for (let m = 1; m <= 12; m++) for (let day = 1; day <= r.months[m - 1]!; day++) yield d(r.year, m, day);
};

describe('Rajpatra fixtures 2080-2083', () => {
  for (const year of [2080, 2081, 2082, 2083]) {
    it(`${year}: month lengths match the lengths derived from the Saturday lists`, () => {
      const saturdays = SATURDAYS[year]!;
      const derived = saturdays.slice(0, 11).map((s, i) => s[s.length - 1]! + 7 - saturdays[i + 1]![0]!);
      if (year < 2083) derived.push(saturdays[11]![saturdays[11]!.length - 1]! + 7 - SATURDAYS[year + 1]![0]![0]!);
      expect(derived).toEqual(DERIVED[year]);
      expect([...record(year).months].slice(0, derived.length)).toEqual(derived);
    });
    it(`${year}: every listed Saturday is a Saturday and no other day is`, () => {
      SATURDAYS[year]!.forEach((list, i) => {
        for (let day = 1; day <= bsMonthLength(year, i + 1); day++) {
          expect(weekday(d(year, i + 1, day)) === 'Saturday', `${year}-${i + 1}-${day}`).toBe(list.includes(day));
        }
      });
    });
    it(`${year}: Baisakh 1 is a ${BAISAKH_1[year]}`, () => {
      expect(weekday(d(year, 1, 1))).toBe(BAISAKH_1[year]);
    });
  }
  it('Christmas anchors from the notices (Poush 9/10)', () => {
    expect(bsToGregorian(d(2080, 9, 9))).toEqual(d(2023, 12, 25));
    expect(bsToGregorian(d(2081, 9, 10))).toEqual(d(2024, 12, 25));
    expect(bsToGregorian(d(2082, 9, 10))).toEqual(d(2025, 12, 25));
    expect(bsToGregorian(d(2083, 9, 10))).toEqual(d(2026, 12, 25));
  });
});

describe('AD anchors', () => {
  it('Baisakh 1 dates', () => {
    expect(bsToGregorian(d(2080, 1, 1))).toEqual(d(2023, 4, 14));
    expect(bsToGregorian(d(2081, 1, 1))).toEqual(d(2024, 4, 13));
    expect(bsToGregorian(d(2082, 1, 1))).toEqual(d(2025, 4, 14));
    expect(bsToGregorian(d(2083, 1, 1))).toEqual(d(2026, 4, 14));
    expect(bsToGregorian(BS_ANCHOR.bs)).toEqual(BS_ANCHOR.gregorian);
  });
  it('library-consensus and Hamro Patro anchors', () => {
    expect(bsToGregorian(d(2000, 1, 1))).toEqual(d(1943, 4, 14));
    expect(bsToGregorian(d(2083, 7, 21))).toEqual(d(2026, 11, 7));
    expect(gregorianToBS(d(2026, 11, 7))).toEqual(d(2083, 7, 21));
    expect(bsToGregorian(d(2078, 4, 1))).toEqual(d(2021, 7, 16));
    expect(bsToGregorian(d(2080, 11, 17))).toEqual(d(2024, 2, 29));
  });
  it('table edges', () => {
    expect(bsToGregorian(BS_TABLE_RANGE.from)).toEqual(d(1918, 4, 13));
    expect(bsToGregorian(BS_TABLE_RANGE.to)).toEqual(d(2043, 4, 15)); // projected 2084+ rows differ from the old dependency, which ended 2043-04-13
  });
});

describe('table invariants', () => {
  it('has one record per year, 1975 to 2099, with 12 months of 29 to 32 days', () => {
    expect(BS_YEARS.map((r) => r.year)).toEqual(Array.from({ length: 125 }, (_, i) => 1975 + i));
    for (const r of BS_YEARS) {
      expect(r.months).toHaveLength(12);
      expect(r.provenance).toHaveLength(12);
      expect(r.sources.length).toBeGreaterThan(0);
      for (const days of r.months) expect(days >= 29 && days <= 32).toBe(true);
      const total = r.months.reduce((a, b) => a + b, 0);
      expect([365, 366], `year ${r.year}`).toContain(total);
    }
  });
  it('per-month bounds guard data entry', () => {
    for (const r of BS_YEARS) {
      expect(r.months[0]! >= 30 && r.months[0]! <= 31, `${r.year} Baisakh`).toBe(true);
      expect(r.months[1]! >= 31 && r.months[1]! <= 32, `${r.year} Jestha`).toBe(true);
      expect(r.months[8]! >= 29 && r.months[8]! <= 30, `${r.year} Poush`).toBe(true);
    }
  });
  it('exports a version and consistent ranges', () => {
    expect(BS_DATA_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(BS_TABLE_RANGE).toEqual({ from: d(1975, 1, 1), to: d(2099, 12, 30) });
    expect(bsMonthLength(2099, 12)).toBe(30);
    expect(BS_OFFICIAL_THROUGH).toEqual(d(2083, 11, 30));
    expect(bsMonthLength(2083, 11)).toBe(BS_OFFICIAL_THROUGH.day);
  });
  it('provenance by year and the verified range hold no unverified or projected month', () => {
    expect(record(2081).provenance.every((p) => p === 'official')).toBe(true);
    expect(record(2083).provenance.slice(0, 11).every((p) => p === 'official')).toBe(true);
    expect(record(2083).provenance[11]).toBe('cross-checked');
    expect(record(2062).provenance.slice(0, 3)).toEqual(['unverified', 'unverified', 'cross-checked']);
    expect(record(2084).provenance.every((p) => p === 'projected')).toBe(true);
    const from = bsToEpochDay(BS_VERIFIED_RANGE.from), to = bsToEpochDay(BS_VERIFIED_RANGE.to);
    const inside: string[] = [];
    for (const r of BS_YEARS) r.provenance.forEach((p, i) => {
      const first = bsToEpochDay(d(r.year, i + 1, 1)), last = first + r.months[i]! - 1;
      if (first >= from && last <= to) inside.push(p);
    });
    expect(inside.length).toBeGreaterThan(0);
    expect(inside.filter((p) => p !== 'official' && p !== 'cross-checked')).toEqual([]);
    // Maximal: the months immediately before and after are not verified.
    expect(record(2062).provenance[1]).toBe('unverified');
    expect(BS_VERIFIED_RANGE.to).toEqual(d(2083, 12, 30));
  });
});

describe('conversion', () => {
  it('round-trips every BS day through AD, strictly increasing and gap-free', () => {
    let previous = bsToEpochDay(BS_TABLE_RANGE.from) - 1, count = 0;
    for (const bs of allBsDays()) {
      const epoch = bsToEpochDay(bs);
      expect(epoch).toBe(previous + 1);
      previous = epoch;
      count++;
      expect(gregorianToBS(bsToGregorian(bs))).toEqual(bs);
      expect(epochDayToBs(epoch)).toEqual(bs);
    }
    expect(count).toBe(BS_YEARS.reduce((n, r) => n + r.months.reduce((a, b) => a + b, 0), 0));
  });
  it('round-trips every AD day in the table span through BS', () => {
    const first = gregorianToEpochDay(d(1918, 4, 13)), last = gregorianToEpochDay(d(2043, 4, 15));
    for (let epoch = first; epoch <= last; epoch++) {
      const ad = epochDayToGregorian(epoch);
      expect(gregorianToEpochDay(ad)).toBe(epoch);
      expect(bsToGregorian(gregorianToBS(ad))).toEqual(ad);
    }
  });
  it('throws outside the table and for invalid fields, never extrapolating', () => {
    expect(() => gregorianToBS(d(1918, 4, 12))).toThrow(/out of supported range/);
    expect(() => gregorianToBS(d(2043, 4, 16))).toThrow(/out of supported range/);
    expect(() => bsToGregorian(d(1974, 12, 30))).toThrow(/out of supported range/);
    expect(() => bsToGregorian(d(2100, 1, 1))).toThrow(/out of supported range/);
    expect(() => bsToGregorian(d(2099, 12, 31))).toThrow(/out of supported range/);
    expect(() => bsToGregorian(d(2080, 13, 1))).toThrow(/out of supported range|integers/);
    expect(() => bsToGregorian(d(2080, 0, 1))).toThrow(/out of supported range|integers/);
    expect(() => bsToGregorian(d(2080, 4, 33))).toThrow(/out of supported range|integers/);
    expect(() => bsToGregorian(d(2080, 1, 32))).toThrow(/out of supported range|integers/);
    expect(() => gregorianToBS(d(2023, 2, 30))).toThrow(/out of supported range|integers/);
    expect(() => gregorianToBS(d(2023, 4, 14.5))).toThrow(/integers/);
    expect(() => bsMonthLength(1974, 1)).toThrow(/out of supported range|integers/);
    expect(() => bsMonthLength(2100, 1)).toThrow(/out of supported range|integers/);
    expect(() => epochDayToBs(Number.NaN)).toThrow(/out of supported range|integers/);
  });
});

// Frozen record of the years where this table deliberately departs from the earlier dependency
// (@remotemerge/nepali-date-converter, removed). Changing any of these is a data decision: update docs/research/bs-calendar
// and the changeset in the same change, not just this test.
const FROZEN: Record<number, readonly number[]> = {
  1977: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1981: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  1991: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1998: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2093: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2096: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2097: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2098: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2099: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
};
describe('frozen month lengths for the disputed and projected years', () => {
  it.each(Object.entries(FROZEN))('%s', (year, months) => {
    expect([...record(Number(year)).months]).toEqual(months);
  });
  it('keeps the last convertible Gregorian day pinned', () => {
    expect(bsToGregorian(BS_TABLE_RANGE.to)).toEqual(d(2043, 4, 15));
  });
});
