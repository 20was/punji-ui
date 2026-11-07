// The treasury desk's state: the scenario (late customers, deferred payments, a rate shock) and what follows from it.
// One reducer, so a change on any screen moves the position, the forecast, the payments and the exposure together.
// Pure apart from the context: no clock, nothing fetched.
import { createContext, useContext, type Dispatch } from 'react';
import { ITEMS, POLICY, SHOCKS, exposure, forecast, levelOf, liquidNow, nprText, place, shockLabel, type Exposure, type Level, type Placed, type Scenario, type Week } from './treasury.ts';

export type Screen = 'position' | 'forecast' | 'payments' | 'fx';
export const SCREENS: readonly Screen[] = ['position', 'forecast', 'payments', 'fx'];

export interface TreasuryState extends Scenario {
  /** Said in a polite live region after each action. */
  notice: string;
}
export type Action = { type: 'stress'; on: boolean } | { type: 'defer'; id: string } | { type: 'undefer'; id: string } | { type: 'shock'; bps: number };

export const initialState = (): TreasuryState => ({ stress: false, deferred: [], fxBps: 0, notice: '' });

export function reducer(state: TreasuryState, action: Action): TreasuryState {
  switch (action.type) {
    case 'stress':
      return { ...state, stress: action.on, notice: action.on ? 'Stress case on: customers pay two weeks late.' : 'Stress case off.' };
    case 'defer': {
      const item = ITEMS.find((i) => i.id === action.id);
      if (!item || !item.deferrable || item.direction !== 'out') return { ...state, notice: 'Not deferred: only supplier payments can be moved.' };
      if (state.deferred.includes(item.id)) return { ...state, notice: `${item.party} is already deferred.` };
      return { ...state, deferred: [...state.deferred, item.id], notice: `${item.party} deferred by two weeks.` };
    }
    case 'undefer':
      return state.deferred.includes(action.id) ? { ...state, deferred: state.deferred.filter((x) => x !== action.id), notice: 'Payment back on its due date.' } : state;
    case 'shock':
      return SHOCKS.includes(action.bps) ? { ...state, fxBps: action.bps, notice: `Dollar rate scenario: ${shockLabel(action.bps)}.` } : state;
  }
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekName = (w: Week) => `week ${w.index + 1} (from ${w.start.day} ${MONTH[w.start.month - 1]})`;

export interface Alert {
  tone: 'danger' | 'warn' | 'info';
  title: string;
  body: string;
}
export interface Derived {
  placed: readonly Placed[];
  weeks: readonly Week[];
  today: bigint;
  /** The lowest closing position in the forecast, and the week it falls in. */
  lowest: Week;
  breaches: readonly Week[];
  exposure: Exposure;
  level: Level;
  alerts: readonly Alert[];
}

export function derive(state: Scenario): Derived {
  const placed = place(state);
  const weeks = forecast(state, placed);
  const today = liquidNow(state);
  const lowest = weeks.reduce((low, w) => (w.closing < low.closing ? w : low));
  const breaches = weeks.filter((w) => w.breach);
  const ex = exposure(state, placed);
  const level = levelOf(today < lowest.closing ? today : lowest.closing);
  const alerts: Alert[] = [];
  if (today < POLICY.minimum) alerts.push({ tone: 'danger', title: 'Liquidity buffer breached today', body: `Liquid cash is ${nprText(today)}, ${nprText(POLICY.minimum - today)} under the policy minimum of ${nprText(POLICY.minimum)}.` });
  if (breaches.length > 0)
    alerts.push({
      tone: 'danger',
      title: `Liquidity buffer breached in ${breaches.length} ${breaches.length === 1 ? 'week' : 'weeks'}`,
      body: `The first is ${weekName(breaches[0]!)}, closing at ${nprText(breaches[0]!.closing)}, ${nprText(POLICY.minimum - breaches[0]!.closing)} under the minimum of ${nprText(POLICY.minimum)}. The lowest is ${weekName(lowest)}. Defer a supplier payment, draw on the term deposit or chase receipts.`,
    });
  else if (level === 'below-target')
    alerts.push({ tone: 'warn', title: 'Below the target buffer', body: `The forecast stays above the minimum of ${nprText(POLICY.minimum)} but falls to ${nprText(lowest.closing)} in ${weekName(lowest)}, under the target of ${nprText(POLICY.target)}.` });
  if (ex.netNpr > POLICY.fxLimit) alerts.push({ tone: 'warn', title: 'Dollar exposure over the limit', body: `The open dollar position is ${nprText(ex.netNpr)} at the scenario rate, over the limit of ${nprText(POLICY.fxLimit)}.` });
  if (alerts.length === 0) alerts.push({ tone: 'info', title: 'Within policy', body: `Liquid cash stays above the target of ${nprText(POLICY.target)} in every week and the dollar position is inside its limit.` });
  return { placed, weeks, today, lowest, breaches, exposure: ex, level, alerts };
}
export interface TreasuryContext {
  state: TreasuryState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}
export const TreasuryContext = createContext<TreasuryContext | null>(null);
export function useTreasury(): TreasuryContext {
  const value = useContext(TreasuryContext);
  if (!value) throw new Error('useTreasury needs the treasury desk');
  return value;
}
