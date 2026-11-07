// Bikram Sambat month-length table, written from this project's own research
// (docs/research/bs-calendar, section 5.2). Month lengths are facts; each month
// carries a provenance and each year cites its sources. Nothing is extrapolated:
// the table ends at 2099 Chaitra and every consumer throws outside it.
//
// Provenance:
//   official       derived from a Nepal Rajpatra Part 5 Home Ministry holiday notice
//   cross-checked  two or more independent sources agree (Hamro Patro, rat32, libraries)
//   unverified     library consensus or a disputed year; the majority value is shipped
//   projected      future year, no official publication yet
//
// Update with the annual Rajpatra notice (docs/research/bs-calendar/README.md) and bump BS_DATA_VERSION.
import type { CalendarDate } from './date-only.ts';

export const BS_DATA_VERSION = '2026.11.0';
export type BsProvenance = 'official' | 'cross-checked' | 'unverified' | 'projected';
export type BsMonths = readonly [number, number, number, number, number, number, number, number, number, number, number, number];
export interface BsYearRecord {
  readonly year: number;
  readonly months: BsMonths;
  /** Provenance of each of the 12 months. */
  readonly provenance: readonly BsProvenance[];
  /** Source identifiers, strongest first. */
  readonly sources: readonly string[];
}

/** Official anchor: 2080-01-01 BS = 2023-04-14 AD (Rajpatra 2079-12-02, a Friday). */
export const BS_ANCHOR = { bs: { year: 2080, month: 1, day: 1 }, gregorian: { year: 2023, month: 4, day: 14 } } as const;

export const BS_TABLE_RANGE: { readonly from: CalendarDate; readonly to: CalendarDate } = { from: { year: 1975, month: 1, day: 1 }, to: { year: 2099, month: 12, day: 30 } };
/** Largest contiguous span of official and cross-checked months (2062 Baisakh and Jestha are disputed). */
export const BS_VERIFIED_RANGE: { readonly from: CalendarDate; readonly to: CalendarDate } = { from: { year: 2062, month: 3, day: 1 }, to: { year: 2083, month: 12, day: 30 } };
/** Last day covered by a primary (Rajpatra) source; 2083 Chaitra becomes official with the 2084 notice. */
export const BS_OFFICIAL_THROUGH: CalendarDate = { year: 2083, month: 11, day: 30 };

/** Row builder: `over` re-labels an inclusive 1-based month range. */
function y(year: number, months: number[], status: BsProvenance, sources: readonly string[], over: readonly (readonly [number, number, BsProvenance])[] = []): BsYearRecord {
  const provenance = months.map((_, i) => over.find(([from, to]) => i + 1 >= from && i + 1 <= to)?.[2] ?? status);
  return { year, months: months as unknown as BsMonths, provenance, sources };
}

export const BS_YEARS: readonly BsYearRecord[] = [
  y(1975, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1976, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'unverified', ['libraries']),
  y(1977, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'unverified', ['libraries']),
  y(1978, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1979, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1980, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'unverified', ['libraries']),
  y(1981, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1982, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1983, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1984, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'unverified', ['libraries']),
  y(1985, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1986, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1987, [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1988, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'unverified', ['libraries']),
  y(1989, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'unverified', ['libraries']),
  y(1990, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['rat32', 'libraries']),
  y(1991, [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'unverified', ['rat32', 'libraries']),
  y(1992, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['rat32', 'libraries']),
  y(1993, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['rat32', 'libraries']),
  y(1994, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['rat32', 'libraries']),
  y(1995, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'cross-checked', ['rat32', 'libraries']),
  y(1996, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['rat32', 'libraries']),
  y(1997, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['rat32', 'libraries']),
  y(1998, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['rat32', 'libraries']),
  y(1999, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['rat32', 'libraries']),
  y(2000, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2001, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2002, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2003, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2004, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2005, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2006, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2007, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2008, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2009, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2010, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2011, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2012, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2013, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2014, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2015, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2016, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2017, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2018, [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2019, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2020, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2021, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2022, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2023, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2024, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2025, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2026, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2027, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2028, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2029, [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2030, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2031, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2032, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2033, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2034, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2035, [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2036, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2037, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2038, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2039, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2040, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2041, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2042, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2043, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2044, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2045, [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2046, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2047, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2048, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2049, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2050, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2051, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2052, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2053, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2054, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2055, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2056, [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2057, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2058, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2059, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2060, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2061, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2062, [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31], 'cross-checked', ['rat32', 'libraries'], [[1, 2, 'unverified']]),
  y(2063, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2064, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2065, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2066, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2067, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2068, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2069, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2070, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2071, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2072, [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2073, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2074, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2075, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2076, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2077, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2078, [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2079, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'cross-checked', ['hamropatro', 'rat32', 'libraries']),
  y(2080, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'official', ['rajpatra:72/65/2079-12-02', 'hamropatro', 'rat32', 'libraries']),
  y(2081, [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'official', ['rajpatra:73/54/2080-10-29', 'hamropatro', 'rat32', 'libraries']),
  y(2082, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'official', ['rajpatra:74/59/2081-11-15', 'hamropatro', 'rat32', 'libraries']),
  y(2083, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'official', ['rajpatra:75/67/2082-11-18', 'hamropatro', 'rat32', 'libraries'], [[12, 12, 'cross-checked']]),
  y(2084, [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2085, [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2086, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2087, [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2088, [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2089, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2090, [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2091, [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2092, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2093, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2094, [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2095, [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2096, [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], 'projected', ['libraries']),
  y(2097, [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2098, [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
  y(2099, [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], 'projected', ['rat32', 'nepali-datetime-pypi']),
];

/** Dispute and shipping notes for individual years. Separate from BS_YEARS so the converter bundle does not carry the text. */
export const BS_YEAR_NOTES: Readonly<Record<number, string>> = {
  1975: 'Library sources split 2 to 1 on Bhadra/Ashwin; majority shipped.',
  1977: 'Disputed; the previous dependency was the sole dissenter. Majority of sources shipped.',
  1981: 'Disputed; the previous dependency was the sole dissenter. Majority of sources shipped.',
  1989: 'Disputed 5 to 1 on Kartik/Mangsir; majority shipped.',
  1991: 'Disputed 4 to 3 on Mangsir/Poush; the previous dependency was in the minority.',
  1998: 'The previous dependency was the sole dissenter; the consensus of the other sources shipped.',
  2055: 'rat32 alone differs on Magh and Falgun (11 sources to 1); majority shipped.',
  2062: 'Baisakh and Jestha disputed (10 sources to 2: Hamro Patro and PyPI); majority 30/32 shipped. Both variants total 62 days, so Asar 1 onward is unaffected.',
  2083: 'Baisakh to Falgun from the Rajpatra Saturday lists; Chaitra 30 is cross-checked until the 2084 notice.',
  2096: 'Projected. The 5-source variant in the research table totals 364 days, which is impossible; the valid 4-source variant (366 days) is shipped instead.',
};
