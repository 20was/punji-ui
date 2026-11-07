// Provenance-aware Bikram Sambat conversion. Every month in the owned table carries a status; these
// functions return it with the date, and a policy decides what happens for months that are not verified.
// Outside the table nothing is extrapolated: the call throws (or returns null with policy 'null').
import { bsToEpochDay, epochDayToBs, epochDayToGregorian, gregorianToEpochDay } from './bs-convert.ts';
import { BS_YEARS, type BsProvenance } from './bs-data.ts';
import type { CalendarDate } from './date-only.ts';

export type { BsProvenance } from './bs-data.ts';
/** How a conversion treats a month that is not verified. 'flag' (default) returns it marked; 'throw' raises; 'null' returns null; 'allow' returns it without a gate (the result still carries its status). */
export type BsPolicy = 'flag' | 'throw' | 'null' | 'allow';
export interface BsConvertOptions {
  /** What to do for a projected or unverified month. Default 'flag'. Outside the table the call always throws, or returns null under 'null'. */
  policy?: BsPolicy;
}
export interface BsConversion {
  /** The converted date: BS for `toBS`, Gregorian for `toAD`. */
  date: CalendarDate;
  /** Provenance of the BS month the date falls in. */
  status: BsProvenance;
  /** True when the month is a projection with no official publication yet. */
  projected: boolean;
  /** True when the month is official or cross-checked by independent sources. */
  verified: boolean;
  /** Source identifiers for the BS year, strongest first. */
  sources: readonly string[];
}

/** Raised under policy 'throw' for a projected or unverified month. */
export class BsProvenanceError extends RangeError {
  readonly status: BsProvenance;
  constructor(status: BsProvenance) {
    super(`The BS date is ${status}: it is not covered by an official or cross-checked source.`);
    this.name = 'BsProvenanceError';
    this.status = status;
  }
}

const FIRST_YEAR = BS_YEARS[0]!.year;

/** Provenance of the month a valid BS date falls in. Throws RangeError for an invalid date or one outside the table. */
export function bsDateStatus(bs: CalendarDate): BsProvenance {
  bsToEpochDay(bs); // validates the date and the table range
  return BS_YEARS[bs.year - FIRST_YEAR]!.provenance[bs.month - 1]!;
}

function describe(bs: CalendarDate, date: CalendarDate, policy: BsPolicy): BsConversion | null {
  const status = bsDateStatus(bs);
  const verified = status === 'official' || status === 'cross-checked';
  if (!verified && policy === 'throw') throw new BsProvenanceError(status);
  if (!verified && policy === 'null') return null;
  return { date, status, projected: status === 'projected', verified, sources: BS_YEARS[bs.year - FIRST_YEAR]!.sources };
}

function guarded<T>(policy: BsPolicy, run: () => T): T | null {
  if (policy !== 'null') return run();
  try { return run(); } catch (error) { if (error instanceof RangeError) return null; throw error; }
}

/** Gregorian to Bikram Sambat with provenance. Outside the table it throws RangeError, or returns null under policy 'null'. */
export function toBS(ad: CalendarDate, options: BsConvertOptions = {}): BsConversion | null {
  const policy = options.policy ?? 'flag';
  return guarded(policy, () => {
    const bs = epochDayToBs(gregorianToEpochDay(ad));
    return describe(bs, bs, policy);
  });
}

/** Bikram Sambat to Gregorian with the provenance of the BS month. Outside the table it throws RangeError, or returns null under policy 'null'. */
export function toAD(bs: CalendarDate, options: BsConvertOptions = {}): BsConversion | null {
  const policy = options.policy ?? 'flag';
  return guarded(policy, () => describe(bs, epochDayToGregorian(bsToEpochDay(bs)), policy));
}
