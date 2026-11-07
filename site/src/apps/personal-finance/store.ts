// The personal finance app's state: goal savings, what has been spent per budget category, and the bills' next due
// dates. Paying a bill spends from its budget category, so the bills and the budget stay one set of figures.
import { createContext, useContext, type Dispatch } from 'react';
import { rs } from '../shared/books.ts';
import { BILLS, CATEGORIES, GOALS, addMonths, type Bill } from './finance.ts';
import type { CalendarDate } from '@punji/ui/nepal/date-only';

export type Screen = 'overview' | 'goals' | 'budget' | 'bills';
export const SCREENS: readonly Screen[] = ['overview', 'goals', 'budget', 'bills'];

export interface BillState {
  due: CalendarDate;
  autopay: boolean;
  /** How many times it was paid in this session. */
  paid: number;
}
export interface FinanceState {
  saved: Readonly<Record<string, bigint>>;
  spent: Readonly<Record<string, bigint>>;
  bills: Readonly<Record<string, BillState>>;
  /** Said in a polite live region after each action. */
  notice: string;
}
export type Action =
  | { type: 'contribute'; goalId: string; amount: bigint }
  | { type: 'spend'; categoryId: string; amount: bigint }
  | { type: 'pay'; billId: string }
  | { type: 'autopay'; billId: string; on: boolean };

export const initialState = (): FinanceState => ({
  saved: Object.fromEntries(GOALS.map((g) => [g.id, g.saved])),
  spent: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.actual])),
  bills: Object.fromEntries(BILLS.map((b) => [b.id, { due: b.due, autopay: b.autopay, paid: 0 }])),
  notice: '',
});

export function reducer(state: FinanceState, action: Action): FinanceState {
  switch (action.type) {
    case 'contribute': {
      const goal = GOALS.find((g) => g.id === action.goalId);
      if (!goal || action.amount <= 0n) return { ...state, notice: 'Not added: enter an amount above zero.' };
      const saved = (state.saved[goal.id] ?? 0n) + action.amount;
      return { ...state, saved: { ...state.saved, [goal.id]: saved }, notice: `${rs(action.amount)} added to ${goal.name}.` };
    }
    case 'spend': {
      const category = CATEGORIES.find((c) => c.id === action.categoryId);
      if (!category || action.amount <= 0n) return { ...state, notice: 'Not recorded: enter an amount above zero.' };
      return { ...state, spent: { ...state.spent, [category.id]: (state.spent[category.id] ?? 0n) + action.amount }, notice: `${rs(action.amount)} recorded under ${category.name}.` };
    }
    case 'pay': {
      const bill = BILLS.find((b) => b.id === action.billId);
      const current = state.bills[action.billId];
      if (!bill || !current) return state;
      return {
        ...state,
        spent: { ...state.spent, [bill.categoryId]: (state.spent[bill.categoryId] ?? 0n) + bill.amount },
        bills: { ...state.bills, [bill.id]: { ...current, due: addMonths(current.due, bill.every), paid: current.paid + 1 } },
        notice: `${bill.name} paid, ${rs(bill.amount)}.`,
      };
    }
    case 'autopay': {
      const current = state.bills[action.billId];
      const bill = BILLS.find((b) => b.id === action.billId);
      if (!current || !bill) return state;
      return { ...state, bills: { ...state.bills, [bill.id]: { ...current, autopay: action.on } }, notice: `Autopay ${action.on ? 'on' : 'off'} for ${bill.name}.` };
    }
  }
}

export const billOf = (id: string): Bill => BILLS.find((b) => b.id === id)!;

export interface FinanceContext {
  state: FinanceState;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}
export const FinanceContext = createContext<FinanceContext | null>(null);
export function useFinance(): FinanceContext {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance needs the personal finance app');
  return value;
}
