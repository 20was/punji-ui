// Illustrative banking data in NPR (paisa). Invented for tests, the docs site and the visual gate (one source); not real accounts.
// Bank and wallet names are display strings only: the library has no list of institutions and no rules for any of them.
// Every account number below is made up (and IBANs are the public documentation examples).
import type { Beneficiary } from '../src/beneficiary-selector/BeneficiarySelector.tsx';
import type { PaymentStep } from '../src/payment-timeline/PaymentTimeline.tsx';
import type { BankTransaction } from '../src/banking/transactions.ts';

/** A full number: tests assert it never reaches the DOM while masked. */
export const sampleAccountNumber = '0123456789012345';
export const shortAccountNumber = '4821';
export const walletId = '9801234567';
export const exampleIban = 'GB82 WEST 1234 5698 7654 32';

export const accounts = {
  savings: { institution: 'NIC Asia Bank', holder: 'Sita Sharma', accountNumber: sampleAccountNumber, accountType: 'Savings account', balance: 24518075n, status: 'active' as const },
  current: { institution: 'Nabil Bank', holder: 'Himalayan Stationers Pvt. Ltd.', accountNumber: '0098765432109876', accountType: 'Current account', balance: 128450000n, status: 'frozen' as const },
  wallet: { institution: 'eSewa', holder: 'Sita Sharma', accountNumber: walletId, accountType: 'Wallet', balance: 1250050n, status: 'active' as const },
  closed: { institution: 'Khalti', holder: 'Ram Thapa', accountNumber: '9849876543', accountType: 'Wallet', balance: 0n, status: 'closed' as const },
};

/** Newest first, as a statement lists them. Running balances are as the bank states them. */
export const transactions: BankTransaction[] = [
  { id: 'tx-1008', date: '2025-11-14', counterparty: 'Bhatbhateni Supermarket', reference: 'POS240118842', category: 'Groceries', amount: -684575n, status: 'completed', balance: 24518075n },
  { id: 'tx-1007', date: '2025-11-14', counterparty: 'Salary, Himalayan Stationers', reference: 'SAL-2081-07', category: 'Income', amount: 6500000n, status: 'completed', balance: 25202650n },
  { id: 'tx-1006', date: '2025-11-13', counterparty: 'Nepal Electricity Authority', reference: 'NEA-KTM-55120', category: 'Utilities', amount: -245050n, status: 'pending', balance: 18702650n },
  { id: 'tx-1005', date: '2025-11-13', counterparty: 'Khalti top-up', reference: 'KH-77120031', category: 'Transfers', amount: -500000n, status: 'failed', balance: 18947700n },
  { id: 'tx-1004', date: '2025-11-12', counterparty: '=HYPERLINK("http://example.test","Refund")', reference: '@REV-0099', category: 'Refund', amount: 150000n, status: 'reversed', balance: 18947700n },
  { id: 'tx-1003', date: '2025-11-12', counterparty: 'Ncell recharge', reference: 'ESW-2025111209', category: 'Mobile', amount: -100000n, status: 'completed', balance: 18797700n },
  { id: 'tx-1002', date: '2025-11-10', counterparty: 'Ram Thapa', reference: 'FT25314XK92Q4B7NLM3', category: 'Family', amount: -2000000n, status: 'completed', balance: 18897700n },
  { id: 'tx-1001', date: '2025-11-09', counterparty: 'Interest credited', reference: 'INT-Q1', category: 'Interest', amount: 42075n, status: 'completed', balance: 20897700n },
];

export const manyTransactions: BankTransaction[] = Array.from({ length: 23 }, (_, i) => ({
  id: `bulk-${String(i + 1).padStart(3, '0')}`,
  date: `2025-10-${String(28 - Math.floor(i / 2)).padStart(2, '0')}`,
  counterparty: ['Daraz Nepal', 'Pathao', 'Ncell', 'Bhat-Bhateni', 'Salary'][i % 5]!,
  reference: `REF-${100000 + i * 37}`,
  amount: i % 5 === 4 ? 5000000n : -BigInt(10000 + i * 1750),
  status: 'completed',
}));

export const beneficiaries: Beneficiary[] = [
  { id: 'b1', name: 'Ram Thapa', nickname: 'Brother', institution: 'Nabil Bank', accountNumber: '0098123456780011', favourite: true },
  { id: 'b2', name: 'Maya Gurung', institution: 'eSewa', accountNumber: '9841234501', favourite: true },
  { id: 'b3', name: 'Himalayan Stationers', nickname: 'Supplier', institution: 'NIC Asia Bank', accountNumber: '0123987654321098', recent: true },
  { id: 'b4', name: 'Sunita Rai', institution: 'Khalti', accountNumber: '9867654320', recent: true },
  { id: 'b5', name: 'Kathmandu Water Supply', institution: 'Global IME Bank', accountNumber: '3301112223334445' },
  { id: 'b6', name: 'Bikash Adhikari', institution: 'Nabil Bank', accountNumber: '0045678912340022' },
  { id: 'b7', name: 'Rina Shrestha', nickname: 'Rent', institution: 'NIC Asia Bank', accountNumber: '0123555566667777' },
];

export const receipt = {
  amount: 2000000n,
  fees: 2500n,
  from: { name: 'Sita Sharma', institution: 'NIC Asia Bank', accountNumber: sampleAccountNumber },
  to: { name: 'Ram Thapa', institution: 'Nabil Bank', accountNumber: '0098123456780011' },
  reference: 'FT25314XK92Q4B7NLM3',
  timestamp: '2025-11-10T10:42:05+05:45',
  note: 'Dashain gift',
  status: 'completed' as const,
};

/** A plain SVG stand-in for a QR code (a pattern of squares, not a real code). */
export const qrPlaceholderPath = 'M0 0h7v7H0zM2 2h3v3H2zM13 0h7v7h-7zM15 2h3v3h-3zM0 13h7v7H0zM2 15h3v3H2zM9 1h2v2H9zM9 5h4v2H9zM8 9h3v3H8zM13 9h2v2h-2zM17 10h3v2h-3zM9 14h2v4H9zM13 13h3v2h-3zM15 17h5v3h-5z';

export const timelineCompleted: PaymentStep[] = [
  { id: 's1', label: 'Initiated', state: 'complete', timestamp: '2025-11-10T10:41:58+05:45' },
  { id: 's2', label: 'Processing', state: 'complete', timestamp: '2025-11-10T10:42:01+05:45' },
  { id: 's3', label: 'Completed', state: 'complete', timestamp: '2025-11-10T10:42:05+05:45' },
];
export const timelineInProgress: PaymentStep[] = [
  { id: 's1', label: 'Initiated', state: 'complete', timestamp: '2025-11-13T09:15:00+05:45' },
  { id: 's2', label: 'Processing', state: 'current', timestamp: '2025-11-13T09:15:04+05:45', detail: 'Waiting for the bank to confirm.' },
  { id: 's3', label: 'Completed', state: 'upcoming' },
];
export const timelineFailed: PaymentStep[] = [
  { id: 's1', label: 'Initiated', state: 'complete', timestamp: '2025-11-13T18:02:11+05:45' },
  { id: 's2', label: 'Processing', state: 'complete', timestamp: '2025-11-13T18:02:14+05:45' },
  { id: 's3', label: 'Failed', state: 'failed', timestamp: '2025-11-13T18:02:30+05:45', detail: 'The wallet declined the top-up.' },
];
export const timelineReversed: PaymentStep[] = [
  { id: 's1', label: 'Initiated', state: 'complete', timestamp: '2025-11-11T12:00:00+05:45' },
  { id: 's2', label: 'Completed', state: 'complete', timestamp: '2025-11-11T12:00:06+05:45' },
  { id: 's3', label: 'Reversed', state: 'reversed', timestamp: '2025-11-12T09:30:00+05:45', detail: 'Returned to the sender by the receiving bank.' },
];
