/**
 * BOID (beneficial owner ID), the 16-digit demat account number issued through a depository participant (DP).
 * The first 8 digits are the DP ID (a 3-digit depository prefix, `130` at CDSC, then the 5-digit DP code); the
 * last 8 are the client ID. These helpers check the shape only: whether an account exists, and whose it is, is
 * for the depository to say.
 */

import { fromDevanagari } from '../internal/digits.ts';

export interface BoidParts {
  /** The 16 ASCII digits. */
  boid: string;
  /** First 8 digits: the depository participant ID ("13013700"). */
  dpId: string;
  /** DP ID without the 3-digit depository prefix ("13700"), as DP lists usually print it. */
  dpCode: string;
  /** Last 8 digits: the client ID ("00012345"). */
  clientId: string;
}

export type BoidProblem = 'empty' | 'invalid-character' | 'too-short' | 'too-long' | 'prefix';

export type BoidCheck = { ok: true; parts: BoidParts } | { ok: false; problem: BoidProblem; digits: number };

export interface BoidOptions {
  /** Digits every BOID must start with. Default `'130'` (CDSC); `null` checks only the length. */
  prefix?: string | null;
}

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Typed or pasted text to ASCII: Devanagari and Arabic-Indic digits converted, spaces, hyphens and dots dropped. Other characters stay so a check can refuse them. */
export function normalizeBoid(text: string): string {
  return fromDevanagari(text)
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[\s\-–.‎‏]/g, '');
}

/** Splits 16 digits into DP ID, DP code and client ID. Throws if it is not 16 ASCII digits. */
export function boidParts(boid: string): BoidParts {
  if (!/^\d{16}$/.test(boid)) throw new RangeError('A BOID is 16 digits');
  return { boid, dpId: boid.slice(0, 8), dpCode: boid.slice(3, 8), clientId: boid.slice(8) };
}

/** Checks typed text as a BOID. */
export function checkBoid(text: string, options: BoidOptions = {}): BoidCheck {
  const prefix = options.prefix === undefined ? '130' : options.prefix;
  const value = normalizeBoid(text);
  const digits = value.replace(/\D/g, '').length;
  if (value === '') return { ok: false, problem: 'empty', digits: 0 };
  if (/\D/.test(value)) return { ok: false, problem: 'invalid-character', digits };
  if (value.length < 16) return { ok: false, problem: 'too-short', digits };
  if (value.length > 16) return { ok: false, problem: 'too-long', digits };
  if (prefix && !value.startsWith(prefix)) return { ok: false, problem: 'prefix', digits };
  return { ok: true, parts: boidParts(value) };
}

/** Plain English for a BOID problem. Replace it with your own words for Nepali. */
export function boidMessage(problem: BoidProblem, digits = 0, options: BoidOptions = {}): string {
  const prefix = options.prefix === undefined ? '130' : options.prefix;
  switch (problem) {
    case 'empty': return 'Enter the 16-digit BOID.';
    case 'invalid-character': return 'A BOID has digits only.';
    case 'too-short': return `A BOID has 16 digits; this has ${digits}.`;
    case 'too-long': return `A BOID has 16 digits; this has ${digits}.`;
    case 'prefix': return `A BOID starts with ${prefix ?? ''}.`;
  }
}

export interface FormatBoidOptions {
  /** 'split' (default): DP ID and client ID ("13013700 00012345"). 'groups': blocks of four. 'plain': 16 digits. */
  style?: 'split' | 'groups' | 'plain';
  /** Show only the last `visible` digits, the rest as bullets. Default: not masked. */
  mask?: boolean;
  /** Digits left visible when masked. Default 4, never more than 8. */
  visible?: number;
}

/** Display text for a BOID. Text that is not a valid BOID is returned normalised but otherwise unchanged. */
export function formatBoid(boid: string, options: FormatBoidOptions = {}): string {
  const value = normalizeBoid(boid);
  if (!/^\d{16}$/.test(value)) return value;
  const visible = Math.min(8, Math.max(0, Math.trunc(options.visible ?? 4)));
  const chars = options.mask ? '•'.repeat(16 - visible) + value.slice(16 - visible) : value;
  if (options.style === 'plain') return chars;
  if (options.style === 'groups') return chars.replace(/(.{4})(?=.)/g, '$1 ');
  return `${chars.slice(0, 8)} ${chars.slice(8)}`;
}

/** Digits read in blocks of four for a screen reader ("1 3 0 1, 3 7 0 0, ..."), so it is not read as one huge number. */
export function spokenBoid(boid: string): string {
  const value = normalizeBoid(boid);
  return (value.match(/.{1,4}/g) ?? []).map((block) => block.split('').join(' ')).join(', ');
}
