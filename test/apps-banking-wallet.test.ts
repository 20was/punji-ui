// The retail banking and digital wallet apps' account logic (site/src/apps): statements whose running balances add
// up, transfers that move the balance, fee and limit together, and wallet payments, cashback, settlement and PINs.
import { describe, expect, it } from 'vitest';
import { LOAN, LOAN_EMI, LOAN_SCHEDULE, derive, initialState, reducer, transferFee, transferProblem, type BankState, type TransferInput } from '../site/src/apps/retail-banking/store.ts';
import { lookupBill } from '../site/src/apps/digital-wallet/bills.ts';
import { cashbackFor, initialState as walletState, makeLoad, makePayment, paymentProblem, reducer as walletReducer, type WalletState } from '../site/src/apps/digital-wallet/store.ts';
import { billTotal } from '../src/bill-summary/BillSummary.tsx';

const consistent = (s: BankState) => {
  for (const id of ['savings', 'current', 'remit'] as const) {
    const list = s.statements[id];
    if (list.length) expect(list[0]!.balance).toBe(s.balances[id]);
    for (let i = 0; i < list.length - 1; i += 1) {
      const t = list[i]!;
      expect(t.balance).toBe(list[i + 1]!.balance! + (t.status === 'failed' ? 0n : t.amount));
    }
  }
};

const send = (amount: bigint, sameBank = false): TransferInput => ({ from: 'savings', payeeName: 'Ram Prasad Adhikari', institution: 'Nabil Bank', accountNumber: '00101017501234', sameBank, amount, remark: 'Rent' });

describe('retail banking', () => {
  it('builds statements whose running balances add up, and a total that is their sum', () => {
    const s = initialState();
    consistent(s);
    expect(derive(s).total).toBe(s.balances.savings + s.balances.current + s.balances.remit);
    expect(initialState()).toEqual(s);
  });

  it('debits a transfer and its fee as two statement lines and uses up the daily limit', () => {
    let s = initialState();
    const before = s.balances.savings;
    s = reducer(s, { type: 'transfer', input: send(12_345_67n) });
    expect(transferFee(12_345_67n, false)).toBe(5_00n);
    expect(s.balances.savings).toBe(before - 12_345_67n - 5_00n);
    expect(s.statements.savings[0]!.counterparty).toBe('ConnectIPS fee');
    expect(s.statements.savings[1]!.amount).toBe(-12_345_67n);
    expect(s.transferredToday).toBe(12_345_67n);
    expect(s.notifications[0]!.title).toBe('Transfer sent');
    consistent(s);
  });

  it('is free inside the bank and refuses what the balance or the limits cannot cover', () => {
    const s = initialState();
    expect(transferFee(50_000_00n, true)).toBe(0n);
    expect(transferProblem(s, 'remit', 100_00n, false)).toMatch(/more than/);
    expect(transferProblem(s, 'savings', 6_00_000_00n, false)).toMatch(/at once/);
    expect(transferProblem(s, 'savings', 0n, false)).toMatch(/above zero/);
    expect(reducer(s, { type: 'transfer', input: { ...send(100_00n), from: 'remit' } })).toEqual(s);
  });

  it('pays an EMI from savings and lowers the outstanding by that row of the schedule', () => {
    let s = initialState();
    const owed = derive(s).loanOutstanding;
    s = reducer(s, { type: 'pay-emi' });
    expect(s.loanPaid).toBe(27);
    expect(derive(s).loanOutstanding).toBe(owed - LOAN_SCHEDULE.rows[26]!.principal);
    expect(s.statements.savings[0]!.amount).toBe(-LOAN_EMI);
    expect(LOAN_SCHEDULE.rows.length).toBe(LOAN.months);
    consistent(s);
  });

  it('blocks a card and charges the replacement to its account', () => {
    let s = initialState();
    const before = s.balances.savings;
    s = reducer(s, { type: 'card-status', cardId: 'debit', status: 'blocked' });
    expect(s.cards[0]!.status).toBe('blocked');
    expect(reducer(s, { type: 'card-status', cardId: 'debit', status: 'active' }).cards[0]!.status).toBe('blocked');
    s = reducer(s, { type: 'card-replace', cardId: 'debit' });
    expect(s.cards[0]!.status).toBe('active');
    expect(s.cards[0]!.number.slice(-4)).not.toBe('4821');
    expect(s.balances.savings).toBe(before - 500_00n);
    consistent(s);
  });

  it('verifies KYC a few ticks after it is submitted', () => {
    let s = reducer(initialState(), { type: 'kyc-submit' });
    expect(s.kyc).toBe('under-review');
    for (let i = 0; i < 5; i += 1) s = reducer(s, { type: 'tick' });
    expect(s.kyc).toBe('verified');
  });
});

describe('digital wallet', () => {
  const pay = (s: WalletState, kind: 'bill' | 'qr' | 'send' | 'topup', amount: bigint, billKey?: string) => walletReducer(s, { type: 'pay', tx: makePayment(s, { kind, title: 'Biller', amount, billKey }) });

  it('pays a bill, adds its cashback as its own entry and marks the bill paid', () => {
    const s0 = walletState();
    const result = lookupBill('electricity', '1234567', s0.paidBills);
    expect(result.state).toBe('ready');
    const total = result.state === 'ready' ? billTotal(result.bill.lines, result.bill.adjustments) : 0n;
    expect(total).toBe(1_979_60n);
    const s1 = pay(s0, 'bill', total, 'electricity:1234567');
    expect(cashbackFor('bill', total)).toBe(39_59n);
    expect(s1.balance).toBe(s0.balance - total + 39_59n);
    expect(s1.txs[0]!.kind).toBe('cashback');
    expect(s1.points).toBe(s0.points + 197);
    expect(lookupBill('electricity', '1234567', s1.paidBills).state).toBe('empty');
  });

  it('caps cashback and refuses payments beyond the balance or the per-payment limit', () => {
    expect(cashbackFor('bill', 10_000_00n)).toBe(50_00n);
    expect(cashbackFor('send', 10_000_00n)).toBe(0n);
    const s = walletState();
    expect(paymentProblem(s, s.balance + 1n)).toMatch(/balance/);
    expect(pay(s, 'send', s.balance + 1n)).toEqual(s);
  });

  it('credits a load only when it settles, and refunds the pending bill that fails', () => {
    let s = walletState();
    const start = s.balance;
    s = walletReducer(s, { type: 'load', tx: makeLoad(s, 'nabil', 5_000_00n) });
    expect(s.balance).toBe(start);
    for (let i = 0; i < 4; i += 1) s = walletReducer(s, { type: 'tick' });
    expect(s.txs.find((t) => t.kind === 'load' && t.date === '2026-11-01')!.status).toBe('completed');
    const failed = s.txs.find((t) => t.id === 't09')!;
    expect(failed.status).toBe('reversed');
    expect(s.balance).toBe(start + 5_000_00n + 1_200_00n);
  });

  it('locks payments after three wrong PINs and redeems points in hundreds from 500', () => {
    let s = walletState();
    for (let i = 0; i < 3; i += 1) s = walletReducer(s, { type: 'pin-fail' });
    expect(s.locked).toBe(true);
    expect(pay(s, 'qr', 100_00n)).toEqual(s);
    let r = walletState();
    expect(walletReducer(r, { type: 'redeem', points: 400 })).toEqual(r);
    r = walletReducer(r, { type: 'redeem', points: 500 });
    expect(r.points).toBe(1_140);
    expect(r.balance).toBe(walletState().balance + 50_00n);
  });
});
