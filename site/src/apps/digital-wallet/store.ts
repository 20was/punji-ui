// The wallet's state: the balance, every payment with its timeline, reward points, PIN attempts and the bills already
// paid. One reducer, so a bill that debits the balance, earns cashback and points and marks the bill paid does it in
// one step, and Home, History, the receipt and Rewards show the same figures to the paisa.
import { createContext, useContext, type Dispatch } from 'react';
import type { TransactionStatusValue } from '@punji/ui/banking';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import type { PaymentStep } from '@punji/ui/payment-timeline';
import { SESSION_DATE } from '../shared/sim.ts';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);

export type Screen = 'home' | 'scan' | 'send' | 'bills' | 'history' | 'rewards';
export const SCREENS: readonly Screen[] = ['home', 'scan', 'send', 'bills', 'history', 'rewards'];
export type BillTab = 'electricity' | 'water' | 'internet' | 'topup';

export const OWNER = 'Sita Sharma';
export const WALLET_ID = '9802000021';
/** The demo PIN. A real wallet sends the PIN to its server, which checks it and counts the attempts. */
export const DEMO_PIN = '2580';
export const MAX_PIN_TRIES = 3;

/** Illustrative limits for a KYC-verified wallet. */
export const LIMITS = { perPayment: 50_000_00n, daily: 1_00_000_00n, monthly: 5_00_000_00n, maxBalance: 2_00_000_00n };

export const LINKED_BANKS = [
  { id: 'nabil', bank: 'Nabil Bank', accountNumber: '00101017004521' },
  { id: 'gibl', bank: 'Global IME Bank', accountNumber: '24507010004410' },
] as const;

export type WalletKind = 'load' | 'qr' | 'send' | 'bill' | 'topup' | 'cashback' | 'receive' | 'redeem';

export interface WalletTx {
  id: string;
  /** ISO instant with offset. */
  at: string;
  date: string;
  kind: WalletKind;
  /** Who was paid, or who paid. */
  title: string;
  /** A second line: the bill, the remark, the bank. */
  detail?: string;
  /** Signed paisa: negative is money out. */
  amount: bigint;
  status: TransactionStatusValue;
  reference: string;
  steps: PaymentStep[];
  /** Cashback this payment earned (credited as its own entry). */
  cashback?: bigint;
  /** Tick at which a pending entry settles. */
  settleAt?: number;
  /** For a pending entry: settle as 'completed' or fail and refund. */
  outcome?: 'completed' | 'failed';
  /** The bill this pays, `service:customer`, so it reads as paid afterwards. */
  billKey?: string;
}

export interface WalletState {
  balance: bigint;
  points: number;
  txs: WalletTx[];
  pinTries: number;
  locked: boolean;
  paidBills: string[];
  tick: number;
  clock: number;
  counter: number;
  offline: boolean;
  hideBalance: boolean;
  notice: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The session's wall clock: 10:30 Kathmandu time on 1 November 2026 plus `minutes`. */
export function instantAt(minutes: number): string {
  const total = 10 * 60 + 30 + minutes;
  return `${SESSION_DATE}T${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}:00+05:45`;
}

const step = (id: string, label: string, state: PaymentStep['state'], timestamp?: string, detail?: string): PaymentStep => ({ id, label, state, timestamp, detail });

/** The steps a finished payment went through. */
export function stepsFor(kind: WalletKind, status: TransactionStatusValue, at: string, title: string): PaymentStep[] {
  const start = step('start', kind === 'load' ? 'Load requested' : 'Payment started', 'complete', at);
  if (kind === 'load') {
    return [
      start,
      step('bank', `Debited from ${title}`, status === 'failed' ? 'failed' : 'complete', status === 'failed' ? undefined : at),
      step('credit', 'Credited to your wallet', status === 'completed' ? 'complete' : status === 'pending' ? 'current' : 'upcoming', status === 'completed' ? at : undefined),
    ];
  }
  if (kind === 'cashback' || kind === 'redeem' || kind === 'receive') return [step('credit', 'Credited to your wallet', 'complete', at)];
  const pin = step('pin', 'PIN confirmed', 'complete', at);
  const debit = step('debit', 'Debited from your wallet', 'complete', at);
  if (status === 'pending') return [start, pin, debit, step('deliver', `Waiting for ${title}`, 'current')];
  if (status === 'failed') return [start, pin, step('deliver', `${title} did not answer`, 'failed', at)];
  if (status === 'reversed') return [start, pin, debit, step('deliver', `${title} refused it`, 'failed', at), step('refund', 'Refunded to your wallet', 'reversed', at)];
  return [start, pin, debit, step('deliver', kind === 'send' ? `Credited to ${title}` : `Paid to ${title}`, 'complete', at)];
}

const past = (id: string, at: string, kind: WalletKind, title: string, amount: bigint, detail?: string, status: TransactionStatusValue = 'completed', cashback?: bigint): WalletTx => ({
  id, at, date: at.slice(0, 10), kind, title, detail, amount, status, reference: `W${id.toUpperCase()}`, steps: stepsFor(kind, status, at, title), cashback,
});

/** The wallet's recent history, newest first. */
const HISTORY: WalletTx[] = [
  { ...past('t09', '2026-11-01T09:12:00+05:45', 'bill', 'Vianet internet', -1_200_00n, 'Renewal, 1 month · vianet_sita', 'pending'), settleAt: 4, outcome: 'failed' },
  past('t08', '2026-11-01T08:40:00+05:45', 'qr', 'Himal Fresh Mart', -842_50n, 'NepalPay QR · Pulchowk'),
  past('t07', '2026-10-31T19:05:00+05:45', 'receive', 'Anita Gurung', 2_500_00n, 'Dinner split'),
  past('t06', '2026-10-31T13:22:00+05:45', 'topup', 'Ncell 9801234567', -500_00n, 'Prepaid top-up', 'completed', 15_00n),
  past('t05', '2026-10-31T13:22:00+05:45', 'cashback', 'Cashback on top-up', 15_00n, '3% on Ncell top-up'),
  past('t04', '2026-10-30T18:47:00+05:45', 'send', 'Hari Bahadur Khatri', -3_000_00n, 'Bike servicing'),
  past('t03', '2026-10-29T07:55:00+05:45', 'load', 'Nabil Bank', 10_000_00n, 'From account ending 4521'),
  past('t02', '2026-10-28T16:10:00+05:45', 'qr', 'Annapurna Momo House', -460_00n, 'NepalPay QR · Jhamsikhel'),
  past('t01', '2026-10-27T11:30:00+05:45', 'send', 'Bikash Shrestha', -1_500_00n, 'Futsal booking', 'failed'),
];

export function initialState(): WalletState {
  return { balance: 12_480_50n, points: 1_640, txs: HISTORY, pinTries: 0, locked: false, paidBills: [], tick: 0, clock: 0, counter: 0, offline: false, hideBalance: false, notice: '' };
}

/** Cashback a payment earns: bills 2% up to Rs 50, top-ups 3% up to Rs 30, QR 1% up to Rs 20 (illustrative). */
export function cashbackFor(kind: WalletKind, amount: bigint): bigint {
  const rule = kind === 'bill' ? [2n, 50_00n] : kind === 'topup' ? [3n, 30_00n] : kind === 'qr' ? [1n, 20_00n] : null;
  if (!rule || amount <= 0n) return 0n;
  const earned = (amount * rule[0]!) / 100n;
  return earned > rule[1]! ? rule[1]! : earned;
}
/** One point for every full Rs 10 spent. */
export const pointsFor = (amount: bigint) => Number(amount / 10_00n);

/** Money that left the wallet today (completed and pending), for the daily and monthly limits. */
export function spentToday(state: WalletState): bigint {
  return state.txs.filter((t) => t.date === SESSION_DATE && t.amount < 0n && (t.status === 'completed' || t.status === 'pending')).reduce((s, t) => s - t.amount, 0n);
}
export function spentThisMonth(state: WalletState): bigint {
  return state.txs.filter((t) => t.date.startsWith(SESSION_DATE.slice(0, 7)) && t.amount < 0n && (t.status === 'completed' || t.status === 'pending')).reduce((s, t) => s - t.amount, 0n);
}

/** Why a payment of `amount` cannot go, or null. */
export function paymentProblem(state: WalletState, amount: bigint | null): string | null {
  if (amount === null || amount <= 0n) return 'Enter an amount above zero.';
  if (amount > state.balance) return `That is more than your balance of ${rs(state.balance)}.`;
  if (amount > LIMITS.perPayment) return `The most you can pay at once is ${rs(LIMITS.perPayment)}.`;
  if (spentToday(state) + amount > LIMITS.daily) return `That goes over today's limit; ${rs(LIMITS.daily - spentToday(state))} is left.`;
  return null;
}

export interface PaymentInput {
  kind: Exclude<WalletKind, 'cashback' | 'redeem' | 'receive' | 'load'>;
  title: string;
  detail?: string;
  /** Positive paisa to pay. */
  amount: bigint;
  billKey?: string;
}

/** The entry a payment will be, with its reference and time: built before dispatch so the receipt shows the same. */
export function makePayment(state: WalletState, input: PaymentInput): WalletTx {
  const at = instantAt(state.clock + 1);
  const id = `p${state.counter + 1}`;
  return {
    id, at, date: SESSION_DATE, kind: input.kind, title: input.title, detail: input.detail, amount: -input.amount, status: 'completed',
    reference: `W2611${String(4100 + state.counter)}`, steps: stepsFor(input.kind, 'completed', at, input.title), cashback: cashbackFor(input.kind, input.amount) || undefined, billKey: input.billKey,
  };
}

export function makeLoad(state: WalletState, bankId: string, amount: bigint): WalletTx {
  const bank = LINKED_BANKS.find((b) => b.id === bankId) ?? LINKED_BANKS[0];
  const at = instantAt(state.clock + 1);
  return {
    id: `p${state.counter + 1}`, at, date: SESSION_DATE, kind: 'load', title: bank.bank, detail: `From account ending ${bank.accountNumber.slice(-4)}`, amount, status: 'pending',
    reference: `W2611${String(4100 + state.counter)}`, steps: stepsFor('load', 'pending', at, bank.bank), settleAt: state.tick + 2, outcome: 'completed',
  };
}

export type Action =
  | { type: 'tick' }
  | { type: 'offline'; offline: boolean }
  | { type: 'hide'; hide: boolean }
  | { type: 'pin-ok' }
  | { type: 'pin-fail' }
  | { type: 'pay'; tx: WalletTx }
  | { type: 'load'; tx: WalletTx }
  | { type: 'redeem'; points: number };

export function reducer(state: WalletState, action: Action): WalletState {
  const next = { ...state, clock: state.clock + 1, counter: state.counter + 1 };
  switch (action.type) {
    case 'tick': {
      const tick = state.tick + 1;
      const due = state.txs.filter((t) => t.status === 'pending' && t.settleAt !== undefined && t.settleAt <= tick);
      if (due.length === 0) return { ...state, tick };
      let balance = state.balance;
      const notes: string[] = [];
      const txs = state.txs.map((t) => {
        if (!due.includes(t)) return t;
        if (t.outcome === 'failed') {
          balance -= t.amount; // the held debit comes back
          notes.push(`${t.title} refused the payment; ${rs(-t.amount)} is back in your wallet.`);
          return { ...t, status: 'reversed' as const, steps: stepsFor(t.kind, 'reversed', t.at, t.title) };
        }
        if (t.kind === 'load') {
          balance += t.amount;
          notes.push(`${rs(t.amount)} from ${t.title} is in your wallet.`);
        }
        return { ...t, status: 'completed' as const, steps: stepsFor(t.kind, 'completed', t.at, t.title) };
      });
      return { ...state, tick, balance, txs, notice: notes.join(' ') };
    }
    case 'offline':
      return { ...state, offline: action.offline, notice: action.offline ? 'Offline: payments cannot be sent.' : 'Back online.' };
    case 'hide':
      return { ...state, hideBalance: action.hide };
    case 'pin-ok':
      return { ...state, pinTries: 0 };
    case 'pin-fail': {
      const tries = state.pinTries + 1;
      return { ...state, pinTries: tries, locked: tries >= MAX_PIN_TRIES, notice: tries >= MAX_PIN_TRIES ? 'Payments are locked after three wrong PINs.' : '' };
    }
    case 'pay': {
      const { tx } = action;
      if (state.locked || paymentProblem(state, -tx.amount)) return state;
      const cashback = tx.cashback ?? 0n;
      const entries: WalletTx[] = [tx];
      if (cashback > 0n) entries.unshift({ id: `${tx.id}-cb`, at: tx.at, date: tx.date, kind: 'cashback', title: `Cashback on ${tx.kind === 'topup' ? 'top-up' : tx.kind === 'qr' ? 'QR payment' : 'bill'}`, detail: tx.title, amount: cashback, status: 'completed', reference: `${tx.reference}C`, steps: stepsFor('cashback', 'completed', tx.at, tx.title) });
      const balance = state.balance + tx.amount + cashback;
      return {
        ...next,
        balance,
        points: state.points + pointsFor(-tx.amount),
        txs: [...entries, ...state.txs],
        paidBills: tx.billKey ? [...state.paidBills, tx.billKey] : state.paidBills,
        notice: `Paid ${rs(-tx.amount)} to ${tx.title}.${cashback > 0n ? ` ${rs(cashback)} cashback added.` : ''} Balance ${rs(balance)}.`,
      };
    }
    case 'load':
      if (state.balance + action.tx.amount > LIMITS.maxBalance) return state;
      return { ...next, txs: [action.tx, ...state.txs], notice: `Loading ${rs(action.tx.amount)} from ${action.tx.title}. It shows in a few seconds.` };
    case 'redeem': {
      if (action.points < 500 || action.points > state.points || action.points % 100 !== 0) return state;
      const amount = BigInt(action.points / 10) * 100n;
      const at = instantAt(next.clock);
      const tx: WalletTx = { id: `r${next.counter}`, at, date: SESSION_DATE, kind: 'redeem', title: 'Points redeemed', detail: `${action.points} points`, amount, status: 'completed', reference: `W2611R${next.counter}`, steps: stepsFor('redeem', 'completed', at, 'Rewards') };
      return { ...next, points: state.points - action.points, balance: state.balance + amount, txs: [tx, ...state.txs], notice: `${action.points} points redeemed for ${rs(amount)}.` };
    }
    default:
      return state;
  }
}

export interface WalletContextValue {
  state: WalletState;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
  billTab: BillTab;
  openBills: (tab: BillTab) => void;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet: outside the digital wallet');
  return value;
}
