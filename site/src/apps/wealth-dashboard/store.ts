// The wealth dashboard's state: the investor's transaction history (from which holdings, dividends and P&L are
// computed), the live market, the bank balances, share-issue applications and savings goals. One reducer, so an
// allotment that adds shares, refunds the unallotted amount and changes net worth does it in one step.
import { createContext, useContext, type Dispatch } from 'react';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { holdingsSummary, positionsFromTransactions, type HoldingsSummary, type PortfolioTransaction } from '@punji/ui/portfolio';
import type { ShareIssue } from '@punji/ui/share-issues';
import type { CorporateEvent } from '@punji/ui/share-issues';
import { createMarket, hashString, scripBySymbol, stepMarket, type MarketState } from '../shared/sim.ts';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);

export type Screen = 'overview' | 'holdings' | 'dividends' | 'issues' | 'actions' | 'goals';

const tx = (id: string, date: string, symbol: string, type: PortfolioTransaction['type'], fields: Partial<PortfolioTransaction>): PortfolioTransaction => {
  const scrip = scripBySymbol(symbol);
  return { id, date, symbol, name: scrip?.name, sector: scrip?.sector, type, ...fields };
};

/** Three years of an ordinary investor's history: buys, a sale, bonus shares, a rights issue and cash dividends. */
export const HISTORY: readonly PortfolioTransaction[] = [
  tx('h01', '2023-08-14', 'NABIL', 'buy', { quantity: 100n, price: 61_500n, fees: 26_400n }),
  tx('h02', '2023-09-03', 'UPPER', 'buy', { quantity: 300n, price: 28_200n, fees: 34_100n }),
  tx('h03', '2023-12-18', 'NTC', 'buy', { quantity: 50n, price: 88_000n, fees: 18_900n }),
  tx('h04', '2024-01-22', 'NABIL', 'dividend', { amount: 165_000n, note: '16.5% cash, FY 2079/80' }),
  tx('h05', '2024-03-10', 'CHCL', 'buy', { quantity: 120n, price: 49_000n, fees: 24_600n }),
  tx('h06', '2024-05-06', 'NTC', 'dividend', { amount: 125_000n, note: '25% cash' }),
  tx('h07', '2024-07-25', 'NABIL', 'bonus', { quantity: 10n, note: '10% bonus' }),
  tx('h08', '2024-09-15', 'NLIC', 'buy', { quantity: 80n, price: 69_000n, fees: 22_700n }),
  tx('h09', '2024-11-28', 'UPPER', 'sell', { quantity: 100n, price: 36_400n, fees: 24_800n }),
  tx('h10', '2025-01-12', 'CHCL', 'rights', { quantity: 24n, price: 10_000n, fees: 500n, note: '1:5 rights at par' }),
  tx('h11', '2025-02-20', 'NABIL', 'dividend', { amount: 121_000n, note: '11% cash, FY 2080/81' }),
  tx('h12', '2025-04-02', 'CIT', 'buy', { quantity: 20n, price: 225_000n, fees: 16_400n }),
  tx('h13', '2025-06-18', 'NTC', 'dividend', { amount: 150_000n, note: '30% cash' }),
  tx('h14', '2025-08-08', 'CHCL', 'dividend', { amount: 72_000n, note: '5% cash' }),
  tx('h15', '2025-10-30', 'HRL', 'buy', { quantity: 60n, price: 76_500n, fees: 19_300n }),
  tx('h16', '2026-01-25', 'NABIL', 'dividend', { amount: 132_000n, note: '12% cash, FY 2081/82' }),
  tx('h17', '2026-03-04', 'NLIC', 'bonus', { quantity: 8n, note: '10% bonus' }),
  tx('h18', '2026-06-21', 'NTC', 'dividend', { amount: 162_500n, note: '32.5% cash' }),
  tx('h19', '2026-09-14', 'GBIME', 'buy', { quantity: 400n, price: 21_300n, fees: 37_000n }),
];

/** Share issues around the session date (1 November 2026). Invented companies; not advice. */
export const ISSUES: readonly ShareIssue[] = [
  { id: 'iss-kvh', company: 'Kaligandaki Valley Hydro', symbol: 'KVHL', kind: 'ipo', shareGroup: 'Ordinary shares', openDate: '2026-10-29', closeDate: '2026-11-04', units: 2_400_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 1_000n, kittaMultiple: 10n, issueManager: 'Himal Capital' },
  { id: 'iss-chcl-r', company: 'Chilime Hydropower', symbol: 'CHCL', kind: 'right', shareGroup: '1:5 right to holders', openDate: '2026-10-18', closeDate: '2026-11-01', units: 14_420_000n, pricePerUnit: 10_000n, minKitta: 1n, maxKitta: 28n, kittaMultiple: 1n, issueManager: 'Gandaki Merchant Bank' },
  { id: 'iss-mf', company: 'Sagarmatha Balanced Fund', kind: 'mutual-fund', shareGroup: 'Closed-end units', openDate: '2026-10-27', closeDate: '2026-11-06', units: 100_000_000n, pricePerUnit: 1_000n, minKitta: 100n, maxKitta: 100_000n, kittaMultiple: 10n },
  { id: 'iss-lci', company: 'Lumbini Cement Industries', symbol: 'LCIL', kind: 'fpo', shareGroup: 'Ordinary shares', openDate: '2026-11-08', closeDate: '2026-11-12', units: 2_000_000n, pricePerUnit: 45_000n, minKitta: 10n, maxKitta: 5_000n, kittaMultiple: 10n, issueManager: 'Himal Capital' },
  { id: 'iss-mlb', company: 'Mechi Laghubitta', symbol: 'MLBS', kind: 'ipo', shareGroup: 'Ordinary shares', openDate: '2026-10-12', closeDate: '2026-10-16', units: 250_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 500n, kittaMultiple: 10n, issueManager: 'Kumari Capital' },
];

/** Corporate actions for the scrips held, by symbol. */
export const ACTIONS: Readonly<Record<string, CorporateEvent[]>> = {
  NABIL: [
    { id: 'n1', kind: 'announcement', date: '2026-10-08', label: 'Board proposes 12% bonus and 6% cash', detail: 'Subject to AGM approval.' },
    { id: 'n2', kind: 'book-close', date: '2026-11-09', detail: 'Hold the shares at the end of 8 Nov to be entitled.' },
    { id: 'n3', kind: 'agm', date: '2026-11-10', detail: 'Hotel Annapurna, Kathmandu, 11:00.' },
    { id: 'n4', kind: 'distribution', date: '2026-12-15', label: 'Cash dividend paid, bonus units credited' },
  ],
  CHCL: [
    { id: 'c1', kind: 'announcement', date: '2026-09-21', label: '1:5 rights at par approved' },
    { id: 'c2', kind: 'right-open', date: '2026-10-18' },
    { id: 'c3', kind: 'right-close', date: '2026-11-01', detail: 'Apply from the IPO centre today.' },
    { id: 'c4', kind: 'listing', date: '2026-12-01', label: 'Rights units listed' },
  ],
  NTC: [
    { id: 't1', kind: 'agm', date: '2026-10-25', detail: 'Approved 35% cash dividend.' },
    { id: 't2', kind: 'book-close', date: '2026-11-18' },
    { id: 't3', kind: 'distribution', date: '2026-12-20', label: '35% cash dividend paid' },
  ],
  UPPER: [{ id: 'u1', kind: 'announcement', date: '2026-11-05', label: 'Q1 results', detail: 'Expected after the board meeting.' }],
};

export type ApplicationStatus = 'applied' | 'allotted' | 'not-allotted';

export interface Application {
  issueId: string;
  kitta: bigint;
  /** The amount blocked in the bank account, paisa. */
  amount: bigint;
  status: ApplicationStatus;
  units?: bigint;
}

export interface Goal {
  id: string;
  name: string;
  target: bigint;
  saved: bigint;
  /** Planned saving per month, paisa. */
  monthly: bigint;
  /** Target date, `YYYY-MM-DD`. */
  due: string;
}

export const OWN_BOID = '1301370000012347';

export interface WealthState {
  market: MarketState;
  transactions: PortfolioTransaction[];
  /** Savings balance available, paisa. */
  bank: bigint;
  /** Fixed deposits, paisa. */
  deposits: bigint;
  applications: Application[];
  goals: Goal[];
  running: boolean;
  notice: string;
}

export function initialState(): WealthState {
  return {
    market: createMarket(),
    transactions: [...HISTORY],
    bank: 42_500_000n,
    deposits: 150_000_000n,
    // Applied for Mechi Laghubitta last month; its result is out.
    applications: [{ issueId: 'iss-mlb', kitta: 50n, amount: 500_000n, status: 'applied' }],
    goals: [
      { id: 'g-emergency', name: 'Emergency fund', target: 60_000_000n, saved: 42_500_000n, monthly: 2_500_000n, due: '2027-06-30' },
      { id: 'g-home', name: 'Home down payment', target: 500_000_000n, saved: 185_000_000n, monthly: 8_000_000n, due: '2029-12-31' },
      { id: 'g-study', name: 'Masters abroad', target: 300_000_000n, saved: 64_000_000n, monthly: 6_000_000n, due: '2028-08-15' },
    ],
    running: true,
    notice: '',
  };
}

export type Action =
  | { type: 'tick' }
  | { type: 'run'; running: boolean }
  | { type: 'apply'; issue: ShareIssue; kitta: bigint; amount: bigint }
  | { type: 'result'; issueId: string; units: bigint }
  | { type: 'contribute'; goalId: string; amount: bigint }
  | { type: 'add-goal'; goal: Goal };

/**
 * The registrar's draw for one BOID and issue, seeded so the same pair always gets the same answer: about half
 * of the applicants receive the minimum (10 kitta), the rest nothing.
 */
export function allotmentFor(issueId: string, boid: string): bigint {
  return hashString(`${issueId}:${boid}`) % 2 === 0 ? 10n : 0n;
}

export function reducer(state: WealthState, action: Action): WealthState {
  switch (action.type) {
    case 'tick':
      return state.running ? { ...state, market: stepMarket(state.market) } : state;
    case 'run':
      return { ...state, running: action.running };
    case 'apply':
      if (state.applications.some((a) => a.issueId === action.issue.id) || action.amount > state.bank) return state;
      return {
        ...state,
        bank: state.bank - action.amount,
        applications: [...state.applications, { issueId: action.issue.id, kitta: action.kitta, amount: action.amount, status: 'applied' }],
        notice: `Applied for ${action.kitta} kitta of ${action.issue.company}; ${rs(action.amount)} is blocked in your account.`,
      };
    case 'result': {
      const app = state.applications.find((a) => a.issueId === action.issueId);
      const issue = ISSUES.find((i) => i.id === action.issueId);
      if (!app || !issue || app.status !== 'applied') return state;
      const units = action.units > app.kitta ? app.kitta : action.units;
      const cost = units * issue.pricePerUnit;
      const applications = state.applications.map((a) => (a.issueId === app.issueId ? { ...a, status: units > 0n ? ('allotted' as const) : ('not-allotted' as const), units } : a));
      const transactions =
        units > 0n
          ? [...state.transactions, { id: `ipo-${issue.id}`, date: '2026-11-01', symbol: issue.symbol ?? issue.company, name: issue.company, sector: 'Newly allotted', type: 'buy' as const, quantity: units, price: issue.pricePerUnit, fees: 0n, note: `${issue.kind.toUpperCase()} allotment` }]
          : state.transactions;
      return {
        ...state,
        applications,
        transactions,
        bank: state.bank + (app.amount - cost),
        notice: units > 0n ? `${units} units of ${issue.company} allotted; ${rs(app.amount - cost)} unblocked.` : `Not allotted in ${issue.company}; ${rs(app.amount)} unblocked.`,
      };
    }
    case 'contribute':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.goalId ? { ...g, saved: g.saved + action.amount } : g)),
        notice: `Added ${rs(action.amount)} to ${state.goals.find((g) => g.id === action.goalId)?.name ?? 'the goal'}.`,
      };
    case 'add-goal':
      return { ...state, goals: [...state.goals, action.goal], notice: `Goal ${action.goal.name} added.` };
    default:
      return state;
  }
}

export interface Derived {
  summary: HoldingsSummary;
  /** Amounts blocked for live applications. */
  blocked: bigint;
  /** Equities at LTP plus bank, blocked and fixed deposits. Holdings without a price count at cost. */
  netWorth: bigint;
  /** Equities part of net worth: market value of priced holdings plus cost of unpriced (not yet listed) ones. */
  equities: bigint;
}

export function derive(state: WealthState): Derived {
  const summary = holdingsSummary(positionsFromTransactions(state.transactions), state.market.quotes);
  const blocked = state.applications.filter((a) => a.status === 'applied').reduce((s, a) => s + a.amount, 0n);
  const unpricedCost = summary.holdings.filter((h) => h.marketValue === null).reduce((s, h) => s + h.costBasis, 0n);
  const equities = (summary.totals.marketValue ?? 0n) + unpricedCost;
  return { summary, blocked, equities, netWorth: equities + state.bank + blocked + state.deposits };
}

export interface WealthContextValue {
  state: WealthState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}

export const WealthContext = createContext<WealthContextValue | null>(null);

export function useWealth(): WealthContextValue {
  const value = useContext(WealthContext);
  if (!value) throw new Error('useWealth: outside the wealth dashboard');
  return value;
}
