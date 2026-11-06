// What the statements app remembers: which account and month are showing, and the demo switch that makes the bank's
// header disagree with its lines. Context only; the data and the checks are in statements.ts.
import { createContext, useContext } from 'react';

export type Screen = 'statement' | 'archive';
export const SCREENS: readonly Screen[] = ['statement', 'archive'];

export interface View {
  holderId: string;
  monthId: string;
  /** Demo: the bank's declared credits are one rupee off, so the statement does not reconcile. */
  drift: boolean;
}

export interface StatementsContext {
  view: View;
  setView: (next: Partial<View>) => void;
  go: (screen: Screen) => void;
  /** Said in a polite live region. */
  say: (message: string) => void;
}
export const StatementsContext = createContext<StatementsContext | null>(null);
export function useStatements(): StatementsContext {
  const value = useContext(StatementsContext);
  if (!value) throw new Error('useStatements needs the statements app');
  return value;
}
