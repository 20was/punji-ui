// The investor's state: every allotment in the folio, SIP mandates, orders on their way to allotment, policies,
// premiums paid, claims and nominees. One reducer, so an order that allots units moves the portfolio, the XIRR, the
// cover-gap savings and the tax view in the same step, and every screen shows the same figures to the paisa.
import { createContext, useContext, type Dispatch } from 'react';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { unitsValue } from '@punji/ui/invest';
import { bsToGregorian, gregorianToBS, nepalFiscalYear } from '@punji/ui/nepal/calendar';
import type { PaymentStep } from '@punji/ui/payment-timeline';
import { SESSION_DATE } from '../shared/sim.ts';
import {
  FUNDS, MONTHS_PER, NAV_DATE, PER_YEAR, SEED_CLAIMS, SEED_MANDATES, SEED_NOMINEES, SEED_POLICIES, addDays, addMonths, allot, fundById, latestNav, navText, premiumOf, seedTransactions, xirrPercent,
  type Claim, type ClaimStage, type Fund, type FundTx, type Holding, type Mandate, type Nominee, type Policy,
} from './data.ts';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);
/** Rupees without the currency mark, for table cells under a heading that names the currency. */
export const nprPlain = { ...npr, display: 'none' as const };

export type Screen = 'funds' | 'sip' | 'portfolio' | 'insurance' | 'tax';
export const SCREENS: readonly Screen[] = ['funds', 'sip', 'portfolio', 'insurance', 'tax'];
export const INVESTOR = 'Sita Sharma';

export type OrderStage = 'placed' | 'paid' | 'nav' | 'allotted' | 'failed';
export interface Order {
  id: string;
  fundId: string;
  kind: 'sip' | 'lumpsum';
  amount: bigint;
  /** SIP: day of the month and yearly step-up. */
  day?: number;
  stepUp?: string;
  stage: OrderStage;
  times: Partial<Record<OrderStage, string>>;
  nextAt?: number;
  /** The allotment, once units are allotted. */
  txId?: string;
  error?: string;
}

export interface PremiumPayment { id: string; policyId: string; date: string; amount: bigint; dueDate: string }

export interface State {
  txs: FundTx[];
  mandates: Mandate[];
  orders: Order[];
  policies: Policy[];
  payments: PremiumPayment[];
  claims: Claim[];
  nominees: Record<string, Nominee[]>;
  /** Demo switch: the next order, premium or claim fails as if the bank or insurer refused it. */
  fail: boolean;
  tick: number;
  counter: number;
  notice: string;
}

export function initialState(): State {
  return {
    txs: seedTransactions(),
    mandates: SEED_MANDATES.map((m) => ({ ...m })),
    orders: [],
    policies: SEED_POLICIES.map((p) => ({ ...p })),
    payments: [],
    claims: SEED_CLAIMS.map((c) => ({ ...c })),
    nominees: Object.fromEntries(Object.entries(SEED_NOMINEES).map(([k, v]) => [k, v.map((n) => ({ ...n }))])),
    fail: false,
    tick: 0,
    counter: 1,
    notice: '',
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The app's clock: 10:30 Kathmandu time on the session date, one minute per tick. */
export function instantAt(tick: number): string {
  const total = 10 * 60 + 30 + tick;
  return `${SESSION_DATE}T${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}:00+05:45`;
}

export type Action =
  | { type: 'tick' }
  | { type: 'order'; fundId: string; kind: 'sip' | 'lumpsum'; amount: bigint; day?: number; stepUp?: string }
  | { type: 'mandate'; id: string; paused: boolean }
  | { type: 'pay-premium'; policyId: string }
  | { type: 'claim'; policyId: string; reason: string; eventDate: string; amount: bigint; documents: string[] }
  | { type: 'nominees'; key: string; nominees: Nominee[] }
  | { type: 'fail'; fail: boolean }
  | { type: 'notice'; text: string };

const ORDER_NEXT: Partial<Record<OrderStage, OrderStage>> = { placed: 'paid', paid: 'nav', nav: 'allotted' };
const CLAIM_NEXT: Partial<Record<ClaimStage, ClaimStage>> = { submitted: 'verified', verified: 'assessed', assessed: 'approved', approved: 'settled' };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      const tick = state.tick + 1;
      const at = instantAt(tick);
      let { txs, mandates, notice } = state;
      const orders = state.orders.map((o) => {
        const next = o.nextAt !== undefined && o.nextAt <= tick ? ORDER_NEXT[o.stage] : undefined;
        if (!next) return o;
        if (next !== 'allotted') return { ...o, stage: next, times: { ...o.times, [next]: at }, nextAt: tick + 1 };
        const tx = allot(`tx-${o.id}`, o.fundId, NAV_DATE, o.kind, o.amount);
        txs = [...txs, tx];
        if (o.kind === 'sip') mandates = [...mandates, { id: `m-${o.id}`, fundId: o.fundId, monthly: o.amount, day: o.day ?? 5, stepUp: o.stepUp ?? '0', start: SESSION_DATE, paused: false }];
        notice = `${navUnits(tx.units)} units of ${fundById(o.fundId)?.name} allotted at NAV ${navText(tx.nav)}.`;
        return { ...o, stage: 'allotted' as const, times: { ...o.times, allotted: at }, nextAt: undefined, txId: tx.id };
      });
      const claims = state.claims.map((c) => {
        const next = c.nextAt !== undefined && c.nextAt <= tick ? CLAIM_NEXT[c.stage] : undefined;
        if (!next) return c;
        if (next === 'settled') notice = `Claim ${c.id} paid: ${rs(c.approved ?? c.amount)} to your bank account.`;
        return { ...c, stage: next, times: { ...c.times, [next]: at }, nextAt: next === 'settled' ? undefined : tick + 1 };
      });
      return { ...state, tick, txs, mandates, orders, claims, notice };
    }
    case 'order': {
      const id = `ORD-${String(state.counter).padStart(4, '0')}`;
      const at = instantAt(state.tick);
      const fund = fundById(action.fundId);
      if (state.fail) {
        const order: Order = { id, fundId: action.fundId, kind: action.kind, amount: action.amount, day: action.day, stepUp: action.stepUp, stage: 'failed', times: { placed: at, failed: at }, error: 'Your bank declined the debit (demo failure). Nothing was taken.' };
        return { ...state, orders: [order, ...state.orders], counter: state.counter + 1, notice: `Order ${id} failed: the bank declined the debit.` };
      }
      const order: Order = { id, fundId: action.fundId, kind: action.kind, amount: action.amount, day: action.day, stepUp: action.stepUp, stage: 'placed', times: { placed: at }, nextAt: state.tick + 1 };
      return { ...state, orders: [order, ...state.orders], counter: state.counter + 1, notice: `Order ${id} placed: ${rs(action.amount)} into ${fund?.name}.` };
    }
    case 'mandate':
      return { ...state, mandates: state.mandates.map((m) => (m.id === action.id ? { ...m, paused: action.paused } : m)), notice: `SIP ${action.paused ? 'paused' : 'resumed'}.` };
    case 'pay-premium': {
      const policy = state.policies.find((p) => p.id === action.policyId);
      if (!policy) return state;
      const amount = premiumOf(policy);
      const payment: PremiumPayment = { id: `PRM-${String(state.counter).padStart(4, '0')}`, policyId: policy.id, date: SESSION_DATE, amount, dueDate: policy.nextDue };
      const policies = state.policies.map((p) => (p.id === policy.id ? { ...p, status: 'active' as const, graceUntil: undefined, nextDue: addMonths(p.nextDue, MONTHS_PER[p.frequency]) } : p));
      return { ...state, policies, payments: [payment, ...state.payments], counter: state.counter + 1, notice: `Premium of ${rs(amount)} paid for ${policy.plan}.` };
    }
    case 'claim': {
      const policy = state.policies.find((p) => p.id === action.policyId);
      const id = `CLM-2083-${String(500 + state.counter).padStart(4, '0')}`;
      const approved = policy && action.amount > policy.sumAssured ? policy.sumAssured : action.amount;
      const claim: Claim = { id, policyId: action.policyId, reason: action.reason, eventDate: action.eventDate, amount: action.amount, approved, stage: 'submitted', times: { submitted: instantAt(state.tick) }, documents: action.documents, nextAt: state.tick + 1 };
      return { ...state, claims: [claim, ...state.claims], counter: state.counter + 1, notice: `Claim ${id} submitted for ${rs(action.amount)}.` };
    }
    case 'nominees':
      return { ...state, nominees: { ...state.nominees, [action.key]: action.nominees }, notice: 'Nominees saved.' };
    case 'fail':
      return { ...state, fail: action.fail };
    case 'notice':
      return { ...state, notice: action.text };
    default:
      return state;
  }
}

/** Units in thousandths as text. */
export const navUnits = (units: bigint) => `${units / 1000n}.${String(units % 1000n).padStart(3, '0')}`;

/** Holdings by fund at the latest NAV, in catalogue order. */
export function holdingsOf(txs: readonly FundTx[]): Holding[] {
  return FUNDS.flatMap((fund) => {
    const mine = txs.filter((t) => t.fundId === fund.id);
    if (mine.length === 0) return [];
    const units = mine.reduce((s, t) => s + t.units, 0n);
    const invested = mine.reduce((s, t) => s + t.amount, 0n);
    const nav = latestNav(fund.id);
    const value = unitsValue(units, navText(nav));
    return [{ fund, units, invested, nav, value, gain: value - invested, xirr: xirrPercent(mine, value) }];
  });
}

export interface PortfolioSummary { invested: bigint; value: bigint; gain: bigint; xirr: string | null; holdings: Holding[] }
export function portfolioOf(txs: readonly FundTx[]): PortfolioSummary {
  const holdings = holdingsOf(txs);
  const value = holdings.reduce((s, h) => s + h.value, 0n);
  const invested = holdings.reduce((s, h) => s + h.invested, 0n);
  return { holdings, value, invested, gain: value - invested, xirr: xirrPercent(txs, value) };
}

/** The Nepali fiscal year (Shrawan to Ashadh) the session date falls in, with its AD bounds. */
const isoOf = (c: { year: number; month: number; day: number }) => `${c.year}-${pad(c.month)}-${pad(c.day)}`;
export function fiscalYear(date = SESSION_DATE) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const fy = nepalFiscalYear(gregorianToBS({ year: y, month: m, day: d }));
  const start = isoOf(bsToGregorian({ year: fy.startYear, month: 4, day: 1 }));
  const nextStart = isoOf(bsToGregorian({ year: fy.endYear, month: 4, day: 1 }));
  return { label: fy.label, start, end: addDays(nextStart, -1) };
}

/** Instalment dates of a mandate after `from` (exclusive) up to `to` (inclusive). */
export function instalmentDates(m: Mandate, from: string, to: string): string[] {
  if (m.paused) return [];
  const dates: string[] = [];
  const [y, mo] = from.split('-').map(Number) as [number, number];
  for (let n = 0; n < 240; n += 1) {
    const date = addMonths(`${y}-${pad(mo)}-${pad(m.day)}`, n);
    if (date > to) break;
    if (date > from && date >= m.start) dates.push(date);
  }
  return dates;
}

/** Retirement-fund contributions in this fiscal year: paid so far, and still to come from active SIPs. */
const saving = (fundId: string) => fundById(fundId)?.taxSaving === true;
export function retirementThisYear(state: Pick<State, 'txs' | 'mandates'>) {
  const fy = fiscalYear();
  const paid = state.txs.filter((t) => saving(t.fundId) && t.date >= fy.start && t.date <= SESSION_DATE).reduce((s, t) => s + t.amount, 0n);
  const planned = state.mandates.filter((m) => saving(m.fundId)).reduce((s, m) => s + m.monthly * BigInt(instalmentDates(m, SESSION_DATE, fy.end).length), 0n);
  const monthsLeft = instalmentDates({ id: 'x', fundId: '', monthly: 0n, day: 5, stepUp: '0', start: SESSION_DATE, paused: false }, SESSION_DATE, fy.end).length;
  return { paid, planned, total: paid + planned, monthsLeft, fy };
}

/** Premiums for one year of each policy, split into life and health (the two deductions). */
const yearly = (p: Policy) => premiumOf(p) * BigInt(PER_YEAR[p.frequency]);
export function yearlyPremiums(policies: readonly Policy[]) {
  return {
    life: policies.filter((p) => p.life).reduce((s, p) => s + yearly(p), 0n),
    health: policies.filter((p) => p.kind === 'health').reduce((s, p) => s + yearly(p), 0n),
  };
}

/** Life cover already held. */
export const lifeCoverOf = (policies: readonly Policy[]) => policies.filter((p) => p.life && p.status !== 'lapsed' && p.status !== 'matured').reduce((s, p) => s + p.sumAssured, 0n);

/** Whole days from the session date to `date` (negative when past). */
export const daysUntil = (date: string) => Math.round((Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) - Date.UTC(+SESSION_DATE.slice(0, 4), +SESSION_DATE.slice(5, 7) - 1, +SESSION_DATE.slice(8, 10))) / 86_400_000);

export const ORDER_STAGES: readonly { id: OrderStage; label: string }[] = [
  { id: 'placed', label: 'Order placed' },
  { id: 'paid', label: 'Payment received by the fund' },
  { id: 'nav', label: 'NAV applied' },
  { id: 'allotted', label: 'Units allotted' },
];
export function orderSteps(o: Order): PaymentStep[] {
  if (o.stage === 'failed') return [{ id: 'placed', label: 'Order placed', state: 'complete', timestamp: o.times.placed }, { id: 'failed', label: 'Payment', state: 'failed', timestamp: o.times.failed, detail: o.error }];
  const at = ORDER_STAGES.findIndex((s) => s.id === o.stage);
  return ORDER_STAGES.map((s, i) => ({ id: s.id, label: s.label, state: i < at || o.stage === 'allotted' ? 'complete' : i === at ? 'current' : 'upcoming', timestamp: o.times[s.id] }));
}

export interface InvestContextValue {
  state: State;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
  /** The fund open in the explorer (null shows the list). */
  fundId: string | null;
  openFund: (id: string | null) => void;
  /** Open the SIP screen on a fund, as a SIP or a lump sum. */
  invest: (fundId: string, kind?: 'sip' | 'lumpsum', monthly?: bigint) => void;
  plan: { fundId: string; kind: 'sip' | 'lumpsum'; monthly?: bigint };
}

export const InvestContext = createContext<InvestContextValue | null>(null);
export function useInvest(): InvestContextValue {
  const value = useContext(InvestContext);
  if (!value) throw new Error('useInvest outside InvestContext');
  return value;
}

export type { Fund };
