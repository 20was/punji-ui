// The retail bank's state: accounts and their statements, saved payees, cards, the home loan, fixed deposits, KYC
// and notifications. One reducer, so a transfer that debits the account, writes the statement lines, uses up the daily
// limit and raises a notification does it in one step, and every screen shows the same figures to the paisa.
import { createContext, useContext, type Dispatch } from 'react';
import type { BankTransaction } from '@punji/ui/banking';
import type { Beneficiary } from '@punji/ui/beneficiary-selector';
import { amortise } from '@punji/ui/lending';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { SESSION_DATE, seeded } from '../shared/sim.ts';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);

export type Screen = 'home' | 'accounts' | 'transfer' | 'cards' | 'loans' | 'profile' | 'alerts';
export const SCREENS: readonly Screen[] = ['home', 'accounts', 'transfer', 'cards', 'loans', 'profile', 'alerts'];

export const BANK = 'Punji Bank';
export const HOLDER = 'Sita Sharma';
export const MOBILE_MASKED = '98XXXXXX21';
/** The one-time code this demo accepts. A real bank sends it by SMS and checks it on its server. */
export const DEMO_OTP = '246810';

export type AccountId = 'savings' | 'current' | 'remit';

export interface Account {
  id: AccountId;
  name: string;
  type: string;
  number: string;
  /** Interest rate, percent a year, as text. */
  rate: string;
}

export const ACCOUNTS: readonly Account[] = [
  { id: 'savings', name: 'Premium Savings', type: 'Savings', number: '01920017004501', rate: '5.25' },
  { id: 'current', name: 'Everyday Current', type: 'Current', number: '01920027010288', rate: '0.00' },
  { id: 'remit', name: 'Remit Saver', type: 'Savings', number: '01920037022110', rate: '6.00' },
];

export const accountById = (id: AccountId) => ACCOUNTS.find((a) => a.id === id)!;

/** The home loan, and its EMI from the package's exact calculator (rounded to the rupee, as banks do). */
export const LOAN = { id: 'home', name: 'Home loan', principal: 4_500_000_00n, ratePercent: '10.25', months: 180, start: '2024-09-15', number: '0192HL0004412' } as const;
export const LOAN_SCHEDULE = amortise({ principal: LOAN.principal, ratePercent: LOAN.ratePercent, months: LOAN.months, rounding: 'half-up', roundTo: 100n });
export const LOAN_EMI = LOAN_SCHEDULE.emi;

export interface Payee extends Beneficiary {
  /** The name the receiving bank holds, for the payee check. */
  registered: string;
  /** Inside this bank (free, instant) or another (ConnectIPS, fee). */
  sameBank: boolean;
}

export const PAYEES: readonly Payee[] = [
  { id: 'p-ram', name: 'Ram Prasad Adhikari', nickname: 'Rent', institution: 'Nabil Bank', accountNumber: '00101017501234', favourite: true, registered: 'Ram Prasad Adhikari', sameBank: false },
  { id: 'p-mother', name: 'Gita Sharma', nickname: 'Mother', institution: BANK, accountNumber: '01920017008812', favourite: true, registered: 'Gita Sharma', sameBank: true },
  { id: 'p-hari', name: 'H. B. Khatri', nickname: 'Hari (bike)', institution: 'Global IME Bank', accountNumber: '24507010009012', recent: true, registered: 'Hari Bahadur Khatri', sameBank: false },
  { id: 'p-school', name: 'Little Buddha Academy', nickname: 'School fees', institution: 'NIC Asia Bank', accountNumber: '33100200417766', recent: true, registered: 'Little Buddha Academy Pvt Ltd', sameBank: false },
  { id: 'p-sunil', name: 'Sunil Rai', institution: 'Siddhartha Bank', accountNumber: '04015500023318', registered: 'Gopal Thapa', sameBank: false },
  { id: 'p-coop', name: 'Lalitpur Saving Cooperative', institution: 'Kumari Bank', accountNumber: '19000300011245', registered: '', sameBank: false },
];

/** Banks for a new payee, and the account names this demo's "receiving banks" hold. */
export const BANKS = ['Nabil Bank', 'Global IME Bank', 'NIC Asia Bank', 'Siddhartha Bank', 'Kumari Bank', 'Himalayan Bank', BANK];
export const DIRECTORY: Readonly<Record<string, string>> = {
  '00101017509999': 'Anita Gurung',
  '24507010001111': 'Bikash Shrestha',
  '01920017001234': 'Maya Tamang',
};

/** ConnectIPS-style fee to another bank: Rs 2 up to Rs 500, Rs 5 up to Rs 50,000, Rs 10 above. Free inside the bank. */
export function transferFee(amount: bigint, sameBank: boolean): bigint {
  if (sameBank || amount <= 0n) return 0n;
  if (amount <= 500_00n) return 2_00n;
  if (amount <= 50_000_00n) return 5_00n;
  return 10_00n;
}
export const DAILY_LIMIT = 10_00_000_00n;
export const PER_TRANSFER_LIMIT = 5_00_000_00n;

export type CardStatus = 'active' | 'frozen' | 'blocked';
export interface CardLimits {
  atm: bigint;
  pos: bigint;
  online: bigint;
}
export interface BankCard {
  id: string;
  name: string;
  network: string;
  number: string;
  expiry: string;
  account: AccountId;
  status: CardStatus;
  limits: CardLimits;
  /** Highest limit the bank allows per channel. */
  maxLimits: CardLimits;
  spentToday: CardLimits;
  online: boolean;
  international: boolean;
  contactless: boolean;
}

export interface FixedDeposit {
  id: string;
  principal: bigint;
  ratePercent: string;
  months: number;
  start: string;
  maturityDate: string;
}

export type NoticeKind = 'transaction' | 'security' | 'reminder' | 'offer';
export interface Notification {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  /** ISO instant with offset. */
  at: string;
  read: boolean;
}

export type KycStatus = 'verified' | 'update-due' | 'under-review';

export interface BankState {
  balances: Record<AccountId, bigint>;
  /** Newest first, per account. Every entry carries the running balance after it. */
  statements: Record<AccountId, BankTransaction[]>;
  cards: BankCard[];
  loanPaid: number;
  deposits: FixedDeposit[];
  notifications: Notification[];
  kyc: KycStatus;
  kycReviewTicks: number;
  transferredToday: bigint;
  /** Minutes since 10:30 on the session date; every action moves the clock a minute. */
  clock: number;
  offline: boolean;
  hideBalances: boolean;
  counter: number;
  notice: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** The session's wall clock: 10:30 Kathmandu time on 1 November 2026 plus `minutes`. */
export function instantAt(minutes: number): string {
  const total = 10 * 60 + 30 + minutes;
  return `${SESSION_DATE}T${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}:00+05:45`;
}

interface Draft {
  date: string;
  counterparty: string;
  amount: bigint;
  category: string;
  status?: BankTransaction['status'];
  reference?: string;
}

/** Three months of an ordinary salaried customer's savings account, from a fixed seed. */
function savingsDrafts(): Draft[] {
  const rand = seeded(2083_07_15);
  const between = (lo: number, hi: number) => BigInt(Math.round(lo + rand() * (hi - lo))) * 100n;
  const out: Draft[] = [];
  const months: [number, number][] = [
    [2026, 8],
    [2026, 9],
    [2026, 10],
  ];
  for (const [y, m] of months) {
    out.push({ date: isoDay(y, m, 1), counterparty: 'Himal Tech Pvt Ltd', amount: 1_25_000_00n, category: 'Salary', reference: `SAL${y}${pad(m)}` });
    out.push({ date: isoDay(y, m, 3), counterparty: 'Ram Prasad Adhikari', amount: -35_000_00n, category: 'Rent', reference: `CIPS${y}${pad(m)}03` });
    out.push({ date: isoDay(y, m, 3), counterparty: 'ConnectIPS fee', amount: -5_00n, category: 'Fees' });
    out.push({ date: isoDay(y, m, 5), counterparty: 'Bhatbhateni Supermarket', amount: -between(2_400, 6_800), category: 'Groceries' });
    out.push({ date: isoDay(y, m, 8), counterparty: 'NEA electricity bill', amount: -between(1_200, 2_600), category: 'Bills' });
    out.push({ date: isoDay(y, m, 10), counterparty: 'WorldLink internet', amount: -1_500_00n, category: 'Bills' });
    out.push({ date: isoDay(y, m, 12), counterparty: 'ATM withdrawal, New Road', amount: -10_000_00n, category: 'Cash' });
    out.push({ date: isoDay(y, m, 15), counterparty: 'Home loan EMI', amount: -LOAN_EMI, category: 'Loan', reference: `EMI${y}${pad(m)}` });
    out.push({ date: isoDay(y, m, 18), counterparty: 'Daraz online', amount: -between(900, 4_200), category: 'Shopping' });
    out.push({ date: isoDay(y, m, 21), counterparty: 'Gita Sharma', amount: -15_000_00n, category: 'Family', reference: `FT${y}${pad(m)}21` });
    out.push({ date: isoDay(y, m, 24), counterparty: 'Pathao rides', amount: -between(600, 1_900), category: 'Transport' });
    out.push({ date: isoDay(y, m, 27), counterparty: 'eSewa wallet load', amount: -5_000_00n, category: 'Wallet' });
  }
  out.push({ date: '2026-09-29', counterparty: 'Hari Bahadur Khatri', amount: -42_000_00n, category: 'Transfers', status: 'failed', reference: 'CIPS20260929' });
  out.push({ date: '2026-10-16', counterparty: 'Quarterly interest', amount: 3_412_75n, category: 'Interest' });
  out.push({ date: '2026-10-16', counterparty: 'TDS on interest (6%)', amount: -204_77n, category: 'Tax' });
  out.push({ date: '2026-11-01', counterparty: 'Himal Tech Pvt Ltd', amount: 1_25_000_00n, category: 'Salary', reference: 'SAL202611' });
  out.push({ date: '2026-11-01', counterparty: 'Daraz online', amount: -2_349_00n, category: 'Shopping', status: 'pending', reference: 'POS20261101A' });
  return out;
}

function currentDrafts(): Draft[] {
  return [
    { date: '2026-08-11', counterparty: 'Kathmandu Design Studio', amount: 48_000_00n, category: 'Income', reference: 'INV-0812' },
    { date: '2026-08-20', counterparty: 'Office rent, Jhamsikhel', amount: -22_000_00n, category: 'Rent' },
    { date: '2026-09-09', counterparty: 'Kathmandu Design Studio', amount: 52_500_00n, category: 'Income', reference: 'INV-0907' },
    { date: '2026-09-20', counterparty: 'Office rent, Jhamsikhel', amount: -22_000_00n, category: 'Rent' },
    { date: '2026-09-30', counterparty: 'Inland Revenue (VAT)', amount: -6_825_00n, category: 'Tax', reference: 'IRD-0930' },
    { date: '2026-10-12', counterparty: 'Everest Prints', amount: 31_250_00n, category: 'Income', reference: 'INV-1010' },
    { date: '2026-10-20', counterparty: 'Office rent, Jhamsikhel', amount: -22_000_00n, category: 'Rent' },
    { date: '2026-10-28', counterparty: 'Adobe subscription', amount: -7_240_00n, category: 'Software' },
  ];
}

/** Statement entries, newest first, with ids and running balances from an opening balance. */
function statementFrom(drafts: Draft[], opening: bigint, prefix: string): BankTransaction[] {
  const sorted = drafts.map((d, i) => ({ d, i })).toSorted((a, b) => (a.d.date === b.d.date ? a.i - b.i : a.d.date < b.d.date ? -1 : 1));
  let balance = opening;
  const rows = sorted.map(({ d }, n) => {
    if (d.status !== 'failed') balance += d.amount;
    return { id: `${prefix}${String(n + 1).padStart(3, '0')}`, date: d.date, counterparty: d.counterparty, amount: d.amount, status: d.status ?? 'completed', reference: d.reference, category: d.category, balance } satisfies BankTransaction;
  });
  return rows.toReversed();
}

export function initialState(): BankState {
  const savings = statementFrom(savingsDrafts(), 2_45_300_55n, 'S');
  const current = statementFrom(currentDrafts(), 18_420_00n, 'C');
  return {
    balances: { savings: savings[0]!.balance!, current: current[0]!.balance!, remit: 0n },
    statements: { savings, current, remit: [] },
    cards: [
      {
        id: 'debit', name: 'Visa Platinum Debit', network: 'Visa', number: '4214560012344821', expiry: '08/29', account: 'savings', status: 'active',
        limits: { atm: 50_000_00n, pos: 1_00_000_00n, online: 50_000_00n }, maxLimits: { atm: 1_00_000_00n, pos: 3_00_000_00n, online: 2_00_000_00n },
        spentToday: { atm: 0n, pos: 2_349_00n, online: 0n }, online: true, international: false, contactless: true,
      },
      {
        id: 'virtual', name: 'Virtual card for online shopping', network: 'Visa', number: '4214560098761937', expiry: '03/27', account: 'current', status: 'frozen',
        limits: { atm: 0n, pos: 0n, online: 25_000_00n }, maxLimits: { atm: 0n, pos: 0n, online: 1_00_000_00n },
        spentToday: { atm: 0n, pos: 0n, online: 0n }, online: true, international: true, contactless: false,
      },
    ],
    loanPaid: 26,
    deposits: [{ id: 'fd-1', principal: 5_00_000_00n, ratePercent: '8.50', months: 12, start: '2026-04-14', maturityDate: '2027-04-14' }],
    notifications: [
      { id: 'n1', kind: 'transaction', title: 'Salary credited', body: `${rs(1_25_000_00n)} from Himal Tech Pvt Ltd to Premium Savings.`, at: '2026-11-01T09:02:00+05:45', read: false },
      { id: 'n2', kind: 'transaction', title: 'Card payment pending', body: `${rs(2_349_00n)} at Daraz online on your Visa debit card ending 4821.`, at: '2026-11-01T09:47:00+05:45', read: false },
      { id: 'n3', kind: 'reminder', title: 'Home loan EMI due on 15 November', body: `${rs(LOAN_EMI)} will be taken from Premium Savings. Keep the balance ready.`, at: '2026-11-01T08:00:00+05:45', read: false },
      { id: 'n4', kind: 'security', title: 'New sign-in on Chrome, macOS', body: 'Kathmandu, 31 October 21:14. If this was not you, freeze your cards and call us.', at: '2026-10-31T21:14:00+05:45', read: true },
      { id: 'n5', kind: 'reminder', title: 'Update your KYC', body: 'Nepal Rastra Bank asks banks to re-verify customers every few years. It takes five minutes.', at: '2026-10-28T10:00:00+05:45', read: true },
      { id: 'n6', kind: 'offer', title: '9.1% on a 2-year fixed deposit', body: 'For deposits opened before Mangsir end. Interest paid quarterly.', at: '2026-10-25T12:00:00+05:45', read: true },
    ],
    kyc: 'update-due',
    kycReviewTicks: 0,
    transferredToday: 0n,
    clock: 0,
    offline: false,
    hideBalances: false,
    counter: 0,
    notice: '',
  };
}

export interface TransferInput {
  from: AccountId;
  payeeName: string;
  institution: string;
  accountNumber: string;
  sameBank: boolean;
  amount: bigint;
  remark: string;
}

export interface TransferDone {
  reference: string;
  at: string;
  fee: bigint;
}

export type Action =
  | { type: 'tick' }
  | { type: 'offline'; offline: boolean }
  | { type: 'hide-balances'; hide: boolean }
  | { type: 'transfer'; input: TransferInput }
  | { type: 'card-status'; cardId: string; status: CardStatus }
  | { type: 'card-toggle'; cardId: string; key: 'online' | 'international' | 'contactless'; value: boolean }
  | { type: 'card-limits'; cardId: string; limits: CardLimits }
  | { type: 'card-replace'; cardId: string }
  | { type: 'pay-emi' }
  | { type: 'open-fd'; from: AccountId; principal: bigint; ratePercent: string; months: number }
  | { type: 'kyc-submit' }
  | { type: 'read'; id: string | 'all' };

/** The reference the next transfer will get (shown on the receipt): FT + session date + a counter. */
export const referenceFor = (counter: number) => `FT20261101${String(1001 + counter)}`;

function addEntry(state: BankState, account: AccountId, entries: Omit<BankTransaction, 'id' | 'balance' | 'date'>[]): Pick<BankState, 'balances' | 'statements'> {
  let balance = state.balances[account];
  const list = [...state.statements[account]];
  let n = list.length;
  for (const e of entries) {
    if (e.status !== 'failed') balance += e.amount;
    n += 1;
    list.unshift({ ...e, id: `${account[0]!.toUpperCase()}${String(n).padStart(3, '0')}`, date: SESSION_DATE, balance });
  }
  return { balances: { ...state.balances, [account]: balance }, statements: { ...state.statements, [account]: list } };
}

function notify(state: BankState, kind: NoticeKind, title: string, body: string): Notification[] {
  return [{ id: `n-${state.counter}-${state.notifications.length}`, kind, title, body, at: instantAt(state.clock), read: false }, ...state.notifications];
}

/** Why a transfer cannot go, or null. The same rules the transfer screen shows as it validates. */
export function transferProblem(state: BankState, from: AccountId, amount: bigint | null, sameBank: boolean): string | null {
  if (amount === null || amount <= 0n) return 'Enter an amount above zero.';
  if (amount > PER_TRANSFER_LIMIT) return `The most you can send at once is ${rs(PER_TRANSFER_LIMIT)}.`;
  const fee = transferFee(amount, sameBank);
  if (amount + fee > state.balances[from]) return `That is more than the ${rs(state.balances[from])} in ${accountById(from).name}${fee ? ` (with the ${rs(fee)} fee)` : ''}.`;
  if (state.transferredToday + amount > DAILY_LIMIT) return `That goes over today's limit: ${rs(DAILY_LIMIT - state.transferredToday)} is left.`;
  return null;
}

export function reducer(state: BankState, action: Action): BankState {
  const at = { ...state, clock: state.clock + 1, counter: state.counter + 1 };
  switch (action.type) {
    case 'tick': {
      if (state.kyc !== 'under-review') return state;
      if (state.kycReviewTicks < 4) return { ...state, kycReviewTicks: state.kycReviewTicks + 1 };
      return { ...at, kyc: 'verified', notifications: notify(at, 'security', 'KYC verified', 'Your details and documents are verified. Thank you.'), notice: 'Your KYC is verified.' };
    }
    case 'offline':
      return { ...state, offline: action.offline, notice: action.offline ? 'Offline: the bank cannot be reached. Nothing will be sent.' : 'Back online.' };
    case 'hide-balances':
      return { ...state, hideBalances: action.hide };
    case 'transfer': {
      const { input } = action;
      if (transferProblem(state, input.from, input.amount, input.sameBank)) return state;
      const fee = transferFee(input.amount, input.sameBank);
      const reference = referenceFor(state.counter);
      const entries: Omit<BankTransaction, 'id' | 'balance' | 'date'>[] = [{ counterparty: input.payeeName, amount: -input.amount, status: 'completed', reference, category: 'Transfers' }];
      if (fee > 0n) entries.push({ counterparty: 'ConnectIPS fee', amount: -fee, status: 'completed', reference, category: 'Fees' });
      const moved = addEntry(at, input.from, entries);
      return {
        ...at,
        ...moved,
        transferredToday: state.transferredToday + input.amount,
        notifications: notify(at, 'transaction', 'Transfer sent', `${rs(input.amount)} to ${input.payeeName}${fee ? ` (fee ${rs(fee)})` : ''}. Reference ${reference}.`),
        notice: `Sent ${rs(input.amount)} to ${input.payeeName}. ${rs(moved.balances[input.from])} left in ${accountById(input.from).name}.`,
      };
    }
    case 'card-status': {
      const card = state.cards.find((c) => c.id === action.cardId);
      if (!card || card.status === 'blocked') return state;
      const words = action.status === 'frozen' ? 'frozen. Payments and withdrawals are declined until you unfreeze it' : action.status === 'active' ? 'unfrozen and ready to use' : 'blocked for good. Order a replacement to get a new number';
      return {
        ...at,
        cards: state.cards.map((c) => (c.id === card.id ? { ...c, status: action.status } : c)),
        notifications: notify(at, 'security', `Card ${action.status === 'frozen' ? 'frozen' : action.status === 'active' ? 'unfrozen' : 'blocked'}`, `Your ${card.name} ending ${card.number.slice(-4)} is ${words}.`),
        notice: `Card ending ${card.number.slice(-4)} ${words}.`,
      };
    }
    case 'card-toggle':
      return { ...at, cards: state.cards.map((c) => (c.id === action.cardId ? { ...c, [action.key]: action.value } : c)), notice: `${action.key === 'online' ? 'Online payments' : action.key === 'international' ? 'International use' : 'Contactless'} turned ${action.value ? 'on' : 'off'}.` };
    case 'card-limits':
      return { ...at, cards: state.cards.map((c) => (c.id === action.cardId ? { ...c, limits: action.limits } : c)), notice: 'Card limits saved.' };
    case 'card-replace': {
      const card = state.cards.find((c) => c.id === action.cardId);
      if (!card || card.status !== 'blocked') return state;
      const fee = 500_00n;
      if (state.balances[card.account] < fee) return { ...state, notice: 'Not enough balance for the replacement fee.' };
      const moved = addEntry(at, card.account, [{ counterparty: 'Card replacement fee', amount: -fee, status: 'completed', category: 'Fees', reference: `CRD${state.counter}` }]);
      const number = `${card.number.slice(0, 12)}${String(5000 + state.counter).slice(-4)}`;
      return {
        ...at,
        ...moved,
        cards: state.cards.map((c) => (c.id === card.id ? { ...c, status: 'active', number, expiry: '11/31', spentToday: { atm: 0n, pos: 0n, online: 0n } } : c)),
        notifications: notify(at, 'security', 'Replacement card ordered', `A new card ending ${number.slice(-4)} is on its way. ${rs(fee)} was charged to ${accountById(card.account).name}.`),
        notice: `Replacement ordered; ${rs(fee)} charged.`,
      };
    }
    case 'pay-emi': {
      if (state.loanPaid >= LOAN.months || state.balances.savings < LOAN_EMI) return { ...state, notice: 'Not enough in Premium Savings for the EMI.' };
      const moved = addEntry(at, 'savings', [{ counterparty: 'Home loan EMI', amount: -LOAN_EMI, status: 'completed', category: 'Loan', reference: `EMI${state.loanPaid + 1}` }]);
      return { ...at, ...moved, loanPaid: state.loanPaid + 1, notifications: notify(at, 'transaction', 'EMI paid', `${rs(LOAN_EMI)} paid to your home loan (instalment ${state.loanPaid + 1} of ${LOAN.months}).`), notice: `EMI of ${rs(LOAN_EMI)} paid.` };
    }
    case 'open-fd': {
      if (action.principal <= 0n || action.principal > state.balances[action.from]) return { ...state, notice: 'Not enough balance to open that deposit.' };
      const moved = addEntry(at, action.from, [{ counterparty: `Fixed deposit, ${action.months} months`, amount: -action.principal, status: 'completed', category: 'Deposits', reference: `FD${state.counter}` }]);
      const end = new Date(Date.UTC(2026, 10 + action.months, 1));
      const maturityDate = isoDay(end.getUTCFullYear(), end.getUTCMonth() + 1, 1);
      return {
        ...at,
        ...moved,
        deposits: [...state.deposits, { id: `fd-${state.counter}`, principal: action.principal, ratePercent: action.ratePercent, months: action.months, start: SESSION_DATE, maturityDate }],
        notifications: notify(at, 'transaction', 'Fixed deposit opened', `${rs(action.principal)} for ${action.months} months at ${action.ratePercent}%.`),
        notice: `Fixed deposit of ${rs(action.principal)} opened.`,
      };
    }
    case 'kyc-submit':
      return { ...at, kyc: 'under-review', kycReviewTicks: 0, notifications: notify(at, 'security', 'KYC submitted', 'We are checking your details and documents. You can keep banking meanwhile.'), notice: 'KYC submitted for review.' };
    case 'read':
      return { ...state, notifications: state.notifications.map((n) => (action.id === 'all' || n.id === action.id ? { ...n, read: true } : n)) };
    default:
      return state;
  }
}

export interface Derived {
  total: bigint;
  unread: number;
  /** Outstanding home loan principal after the instalments paid. */
  loanOutstanding: bigint;
}

/** The outstanding principal after `paid` instalments: the closing balance of that row of the loan's schedule. */
export function outstandingAfter(paid: number): bigint {
  if (paid <= 0) return LOAN.principal;
  return LOAN_SCHEDULE.rows[Math.min(paid, LOAN_SCHEDULE.rows.length) - 1]!.closing;
}

export function derive(state: BankState): Derived {
  return {
    total: state.balances.savings + state.balances.current + state.balances.remit,
    unread: state.notifications.filter((n) => !n.read).length,
    loanOutstanding: outstandingAfter(state.loanPaid),
  };
}

export interface BankContextValue {
  state: BankState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
  /** The account the statements screen opens on. */
  focusAccount: (id: AccountId) => void;
  account: AccountId;
}

export const BankContext = createContext<BankContextValue | null>(null);

export function useBank(): BankContextValue {
  const value = useContext(BankContext);
  if (!value) throw new Error('useBank: outside the retail banking app');
  return value;
}
