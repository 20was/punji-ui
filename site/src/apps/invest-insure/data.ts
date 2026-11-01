// The fixed data the invest and insure app starts from: eight synthetic open-ended funds with five years of weekly
// NAVs (seeded, so the server and the browser draw the same history), the investor's past SIP instalments and
// purchases, three insurance policies, a settled claim and nominees. Pure TypeScript: no React, no clock.
// Fund houses, insurers and people are invented. NAVs are bigint ten-thousandths of a rupee (4 decimal places).
import { allotUnits, xirr, type CashFlow } from '@punji/ui/invest';
import type { PolicyStatus, PremiumFrequency, PremiumLine } from '@punji/ui/insurance-premium-card';
import type { PaymentStep } from '@punji/ui/payment-timeline';
import { SESSION_DATE, hashString, seeded } from '../shared/sim.ts';

export type FundCategory = 'equity' | 'index' | 'hybrid' | 'debt' | 'liquid' | 'retirement';
export const CATEGORY_LABEL: Record<FundCategory, string> = { equity: 'Equity', index: 'Index', hybrid: 'Hybrid', debt: 'Debt', liquid: 'Liquid', retirement: 'Retirement' };

export interface Fund {
  id: string;
  name: string;
  house: string;
  category: FundCategory;
  /** Riskometer level, 1 (Low) to 6 (Very high). */
  risk: number;
  /** Total expense ratio a year, percent. */
  expenseRatio: string;
  exitLoad: string;
  minSip: bigint;
  minLumpSum: bigint;
  /** Assets under management, paisa. */
  aum: bigint;
  inception: string;
  manager: string;
  benchmark: string;
  /** Contributions reduce taxable income (an approved retirement fund). */
  taxSaving?: boolean;
  /** Weekly drift and volatility of the synthetic NAV. */
  drift: number;
  vol: number;
  /** NAV at the start of the history, in ten-thousandths. */
  startNav: number;
}

const RS = 100n;
const LAKH = 1_00_000n * RS;
const CRORE = 100n * LAKH;

export const FUNDS: readonly Fund[] = [
  { id: 'himal-growth', name: 'Himal Equity Growth Fund', house: 'Himal Asset Management', category: 'equity', risk: 5, expenseRatio: '1.95', exitLoad: '1% if redeemed within 1 year', minSip: 1_000n * RS, minLumpSum: 5_000n * RS, aum: 312n * CRORE, inception: '2016-04-14', manager: 'Anita Shrestha', benchmark: 'NEPSE Total Return', drift: 0.0028, vol: 0.032, startNav: 11_4200 },
  { id: 'trishuli-index', name: 'Trishuli NEPSE Index Fund', house: 'Trishuli Capital', category: 'index', risk: 5, expenseRatio: '0.95', exitLoad: 'Nil', minSip: 500n * RS, minLumpSum: 1_000n * RS, aum: 148n * CRORE, inception: '2019-07-17', manager: 'Bikash Thapa', benchmark: 'NEPSE Index', drift: 0.0022, vol: 0.03, startNav: 9_8700 },
  { id: 'koshi-balanced', name: 'Koshi Balanced Advantage Fund', house: 'Koshi Investments', category: 'hybrid', risk: 4, expenseRatio: '1.70', exitLoad: '0.5% if redeemed within 6 months', minSip: 1_000n * RS, minLumpSum: 5_000n * RS, aum: 221n * CRORE, inception: '2017-01-01', manager: 'Sarita Karki', benchmark: '60% NEPSE, 40% government bonds', drift: 0.0019, vol: 0.017, startNav: 10_9100 },
  { id: 'himal-dividend', name: 'Himal Dividend Yield Fund', house: 'Himal Asset Management', category: 'equity', risk: 5, expenseRatio: '1.85', exitLoad: '1% if redeemed within 1 year', minSip: 1_000n * RS, minLumpSum: 5_000n * RS, aum: 96n * CRORE, inception: '2018-09-01', manager: 'Anita Shrestha', benchmark: 'NEPSE Total Return', drift: 0.0021, vol: 0.026, startNav: 10_2500 },
  { id: 'trishuli-debt', name: 'Trishuli Short Term Debt Fund', house: 'Trishuli Capital', category: 'debt', risk: 2, expenseRatio: '0.85', exitLoad: 'Nil', minSip: 500n * RS, minLumpSum: 10_000n * RS, aum: 184n * CRORE, inception: '2018-03-01', manager: 'Ramesh Adhikari', benchmark: '1-year Treasury bill', drift: 0.0013, vol: 0.0016, startNav: 10_0400 },
  { id: 'koshi-liquid', name: 'Koshi Liquid Fund', house: 'Koshi Investments', category: 'liquid', risk: 1, expenseRatio: '0.40', exitLoad: 'Nil', minSip: 500n * RS, minLumpSum: 1_000n * RS, aum: 402n * CRORE, inception: '2020-01-15', manager: 'Puja Gurung', benchmark: '91-day Treasury bill', drift: 0.00095, vol: 0.0004, startNav: 10_0000 },
  { id: 'himal-smallcap', name: 'Himal Small Cap Opportunities Fund', house: 'Himal Asset Management', category: 'equity', risk: 6, expenseRatio: '2.10', exitLoad: '1% if redeemed within 18 months', minSip: 1_000n * RS, minLumpSum: 5_000n * RS, aum: 58n * CRORE, inception: '2021-02-01', manager: 'Kiran Rai', benchmark: 'NEPSE Small Cap', drift: 0.0031, vol: 0.045, startNav: 10_0000 },
  { id: 'koshi-retirement', name: 'Koshi Retirement Savings Fund', house: 'Koshi Investments', category: 'retirement', risk: 3, expenseRatio: '1.50', exitLoad: 'Locked in until age 58, or 10 years', minSip: 500n * RS, minLumpSum: 5_000n * RS, aum: 133n * CRORE, inception: '2018-07-17', manager: 'Sarita Karki', benchmark: '40% NEPSE, 60% government bonds', taxSaving: true, drift: 0.0017, vol: 0.011, startNav: 10_6000 },
];

export const fundById = (id: string): Fund | undefined => FUNDS.find((f) => f.id === id);

const MS_DAY = 86_400_000;
const dayOf = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / MS_DAY;
const isoOf = (day: number) => new Date(day * MS_DAY).toISOString().slice(0, 10);
/** `iso` moved by whole days. */
export const addDays = (iso: string, days: number) => isoOf(dayOf(iso) + days);
/** Whole days from a to b. */
export const daysFrom = (a: string, b: string) => dayOf(b) - dayOf(a);
/** The same day `n` months later (day kept, clamped to 28 for safety). */
export function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const d = Math.min(Number(iso.slice(8, 10)), 28);
  return `${y + Math.floor(m / 12)}-${String((m % 12 + 12) % 12 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 261 weekly dates ending on the session date: a little over five years. */
export const NAV_WEEKS = 261;
export const NAV_DATES: readonly string[] = Array.from({ length: NAV_WEEKS }, (_, i) => addDays(SESSION_DATE, (i - NAV_WEEKS + 1) * 7));

/** A fund's weekly NAVs (ten-thousandths), oldest first; seeded by its id. */
function history(fund: Fund): bigint[] {
  const rand = seeded(hashString(fund.id));
  let nav = fund.startNav;
  return NAV_DATES.map((_, i) => {
    if (i > 0) nav = Math.max(1_0000, Math.round(nav * (1 + fund.drift + fund.vol * (rand() + rand() + rand() - 1.5))));
    return BigInt(nav);
  });
}
const HISTORY = new Map<string, bigint[]>();
export function navHistory(fundId: string): bigint[] {
  let h = HISTORY.get(fundId);
  if (!h) {
    const fund = fundById(fundId);
    if (!fund) throw new Error(`Unknown fund ${fundId}`);
    h = history(fund);
    HISTORY.set(fundId, h);
  }
  return h;
}

/** NAV ten-thousandths as the decimal string the invest helpers take ('12.3456'). */
export const navText = (nav: bigint) => `${nav / 10_000n}.${String(nav % 10_000n).padStart(4, '0')}`;
/** The latest NAV published on or before `date` (NAVs are weekly here). */
export function navOn(fundId: string, date: string): bigint {
  const h = navHistory(fundId);
  let index = 0;
  for (let i = 0; i < NAV_DATES.length; i += 1) if (NAV_DATES[i]! <= date) index = i;
  return h[index]!;
}
export const latestNav = (fundId: string) => navHistory(fundId).at(-1)!;
export const NAV_DATE = NAV_DATES.at(-1)!;

export type ReturnPeriod = 1 | 3 | 5;
const RETURNS = new Map<string, string | null>();
/** Annualised return over 1, 3 or 5 years from the NAV, as a percent with two places ('14.27'); XIRR of buying one unit then and valuing it now. */
export function fundReturn(fundId: string, years: ReturnPeriod): string | null {
  const key = `${fundId}:${years}`;
  if (RETURNS.has(key)) return RETURNS.get(key)!;
  const h = navHistory(fundId);
  const back = years * 52;
  const value = back >= h.length ? null : (xirr([{ date: NAV_DATES[h.length - 1 - back]!, amount: -h[h.length - 1 - back]! }, { date: NAV_DATE, amount: h.at(-1)! }], { digits: 4 })?.percent ?? null);
  RETURNS.set(key, value);
  return value;
}

/** One allotment (or redemption) in the investor's folio. */
export interface FundTx {
  id: string;
  fundId: string;
  date: string;
  kind: 'sip' | 'lumpsum';
  /** Paisa paid. */
  amount: bigint;
  /** NAV applied, ten-thousandths. */
  nav: bigint;
  /** Units allotted, thousandths. */
  units: bigint;
  /** Paisa carried to the next instalment (amount − cost of the units). */
  remainder: bigint;
}

export function allot(id: string, fundId: string, date: string, kind: FundTx['kind'], amount: bigint): FundTx {
  const nav = navOn(fundId, date);
  const a = allotUnits(amount, navText(nav));
  return { id, fundId, date, kind, amount, nav, units: a.units, remainder: a.remainder };
}

/** A monthly SIP mandate. */
export interface Mandate {
  id: string;
  fundId: string;
  /** Paisa a month. */
  monthly: bigint;
  /** Day of the month it is debited. */
  day: number;
  /** Step-up percent each year ('0' for none). */
  stepUp: string;
  start: string;
  paused: boolean;
}

export const SEED_MANDATES: readonly Mandate[] = [
  { id: 'm-growth', fundId: 'himal-growth', monthly: 5_000n * RS, day: 5, stepUp: '0', start: '2023-11-05', paused: false },
  { id: 'm-balanced', fundId: 'koshi-balanced', monthly: 3_000n * RS, day: 5, stepUp: '0', start: '2024-05-05', paused: false },
  { id: 'm-retire', fundId: 'koshi-retirement', monthly: 2_500n * RS, day: 5, stepUp: '0', start: '2025-08-05', paused: false },
];

/** The instalments each seed mandate has paid up to the session date, and a lump sum in the debt fund. */
export function seedTransactions(): FundTx[] {
  const txs: FundTx[] = [];
  for (const m of SEED_MANDATES) {
    for (let date = m.start, n = 0; date <= SESSION_DATE; n += 1, date = addMonths(m.start, n)) txs.push(allot(`${m.id}-${n + 1}`, m.fundId, date, 'sip', m.monthly));
  }
  txs.push(allot('ls-debt-1', 'trishuli-debt', '2025-03-12', 'lumpsum', 1_00_000n * RS));
  return txs.toSorted((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
}

export interface Holding {
  fund: Fund;
  units: bigint;
  invested: bigint;
  nav: bigint;
  value: bigint;
  gain: bigint;
  /** XIRR percent ('12.34') or null for a holding too new to annualise. */
  xirr: string | null;
}

/** Cash flows for XIRR: every purchase out, the value in on the NAV date. */
export const flowsOf = (txs: readonly FundTx[], value: bigint): CashFlow[] => [...txs.map((t) => ({ date: t.date, amount: -t.amount })), { date: NAV_DATE, amount: value }];

/** XIRR as percent with two places, or null when a holding is younger than 30 days (annualising it would mislead). */
export function xirrPercent(txs: readonly FundTx[], value: bigint): string | null {
  if (txs.length === 0 || daysFrom(txs.reduce((a, t) => (t.date < a ? t.date : a), txs[0]!.date), NAV_DATE) < 30) return null;
  return xirr(flowsOf(txs, value), { digits: 4 })?.percent ?? null;
}

export interface Policy {
  id: string;
  plan: string;
  insurer: string;
  kind: 'term' | 'endowment' | 'health';
  policyNumber: string;
  status: PolicyStatus;
  frequency: PremiumFrequency;
  breakdown: PremiumLine[];
  nextDue: string;
  /** Last day of the grace period when a premium is overdue. */
  graceUntil?: string;
  sumAssured: bigint;
  termYears: number;
  /** Life cover counts toward the cover-gap calculator; health does not. */
  life: boolean;
}

export const SEED_POLICIES: readonly Policy[] = [
  {
    id: 'p-term', plan: 'Suraksha Term Plan', insurer: 'Himal Life Insurance', kind: 'term', policyNumber: 'HLI-T-2024-018842', status: 'active', frequency: 'yearly',
    breakdown: [{ id: 'base', label: 'Base premium', amount: 13_800n * RS }, { id: 'adb', label: 'Accidental death rider', amount: 700n * RS }],
    nextDue: '2026-11-20', sumAssured: 50n * LAKH, termYears: 25, life: true,
  },
  {
    id: 'p-endow', plan: 'Jeevan Bachat Endowment', insurer: 'Himal Life Insurance', kind: 'endowment', policyNumber: 'HLI-E-2019-004417', status: 'grace', frequency: 'half-yearly',
    breakdown: [{ id: 'base', label: 'Base premium', amount: 24_350n * RS }],
    nextDue: '2026-10-15', graceUntil: '2026-11-14', sumAssured: 10n * LAKH, termYears: 20, life: true,
  },
  {
    id: 'p-health', plan: 'Parivar Health Cover', insurer: 'Koshi General Insurance', kind: 'health', policyNumber: 'KGI-H-2026-120093', status: 'active', frequency: 'yearly',
    breakdown: [{ id: 'base', label: 'Premium', amount: 16_000n * RS }, { id: 'vat', label: 'VAT 13%', amount: 2_080n * RS }],
    nextDue: '2027-02-01', sumAssured: 5n * LAKH, termYears: 1, life: false,
  },
];

export const premiumOf = (p: Policy) => p.breakdown.reduce((s, l) => s + l.amount, 0n);
export const PER_YEAR: Record<PremiumFrequency, number> = { monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1, single: 0 };
export const MONTHS_PER: Record<PremiumFrequency, number> = { monthly: 1, quarterly: 3, 'half-yearly': 6, yearly: 12, single: 0 };

export interface Nominee {
  id: string;
  name: string;
  relation: string;
  /** Whole percent. */
  share: number;
}

export const SEED_NOMINEES: Readonly<Record<string, readonly Nominee[]>> = {
  'p-term': [{ id: 'n1', name: 'Ramesh Sharma', relation: 'Spouse', share: 60 }, { id: 'n2', name: 'Aarav Sharma', relation: 'Son', share: 40 }],
  'p-endow': [{ id: 'n3', name: 'Ramesh Sharma', relation: 'Spouse', share: 100 }],
  'p-health': [],
  folio: [{ id: 'n4', name: 'Ramesh Sharma', relation: 'Spouse', share: 100 }],
};

export type ClaimStage = 'submitted' | 'verified' | 'assessed' | 'approved' | 'settled' | 'rejected';
export const CLAIM_STAGES: readonly { id: ClaimStage; label: string }[] = [
  { id: 'submitted', label: 'Claim submitted' },
  { id: 'verified', label: 'Documents verified' },
  { id: 'assessed', label: 'Assessed by the insurer' },
  { id: 'approved', label: 'Approved' },
  { id: 'settled', label: 'Paid to your bank account' },
];

export interface Claim {
  id: string;
  policyId: string;
  reason: string;
  eventDate: string;
  /** Paisa claimed. */
  amount: bigint;
  /** Paisa approved (after the insurer's assessment). */
  approved?: bigint;
  stage: ClaimStage;
  /** ISO instants of each stage reached. */
  times: Partial<Record<ClaimStage, string>>;
  documents: string[];
  /** Tick at which it moves to the next stage. */
  nextAt?: number;
}

export const SEED_CLAIMS: readonly Claim[] = [
  {
    id: 'CLM-2083-0412', policyId: 'p-health', reason: 'Day-care procedure (cataract)', eventDate: '2026-08-02', amount: 62_400n * RS, approved: 58_900n * RS, stage: 'settled',
    times: { submitted: '2026-08-05T11:20:00+05:45', verified: '2026-08-07T15:05:00+05:45', assessed: '2026-08-12T10:40:00+05:45', approved: '2026-08-12T16:10:00+05:45', settled: '2026-08-14T09:30:00+05:45' },
    documents: ['Discharge summary', 'Hospital bills', 'Prescription'],
  },
];

/** The claim's progress as PaymentTimeline steps. */
export function claimSteps(claim: Claim): PaymentStep[] {
  const reached = CLAIM_STAGES.findIndex((s) => s.id === claim.stage);
  return CLAIM_STAGES.map((s, i) => ({
    id: s.id,
    label: s.label,
    state: claim.stage === 'rejected' ? (i === 0 ? 'complete' : i === 1 ? 'failed' : 'upcoming') : i < reached || claim.stage === 'settled' ? 'complete' : i === reached ? 'current' : 'upcoming',
    timestamp: claim.times[s.id],
  }));
}
