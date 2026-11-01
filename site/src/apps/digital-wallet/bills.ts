// The simulated billers: what a biller gateway answers for a customer ID. Replace `lookupBill` with your gateway.
import type { BillLine } from '@punji/ui/bill-summary';
import type { PaymentStatusValue } from '@punji/ui/payment-status';

export type Service = 'electricity' | 'water' | 'internet';

export interface Biller {
  service: Service;
  name: string;
  /** Branch, counter or provider the customer chooses first. */
  places: { value: string; label: string }[];
  placeLabel: string;
  idLabel: string;
  idHint: string;
}

export const BILLERS: Record<Service, Biller> = {
  electricity: {
    service: 'electricity',
    name: 'Nepal Electricity Authority',
    placeLabel: 'Counter',
    places: [
      { value: 'ratnapark', label: 'Kathmandu, Ratnapark' },
      { value: 'pulchowk', label: 'Lalitpur, Pulchowk' },
      { value: 'bhaktapur', label: 'Bhaktapur' },
    ],
    idLabel: 'Customer ID',
    idHint: 'On your meter card. Try 1234567, 7654321 (overdue) or 1111111 (nothing due).',
  },
  water: {
    service: 'water',
    name: 'KUKL water supply',
    placeLabel: 'Branch',
    places: [
      { value: 'tripureshwor', label: 'Tripureshwor' },
      { value: 'lalitpur', label: 'Lalitpur' },
    ],
    idLabel: 'Customer number',
    idHint: 'Try 20145.',
  },
  internet: {
    service: 'internet',
    name: 'Internet',
    placeLabel: 'Provider',
    places: [
      { value: 'worldlink', label: 'WorldLink' },
      { value: 'vianet', label: 'Vianet' },
      { value: 'classictech', label: 'Classic Tech' },
    ],
    idLabel: 'Username',
    idHint: 'Try sita_home.',
  },
};

export interface Bill {
  customerName: string;
  period: string;
  lines: BillLine[];
  adjustments: BillLine[];
  dueDate: string;
  status: PaymentStatusValue;
}
export interface InternetPlan {
  id: string;
  label: string;
  amount: bigint;
}
export const PLANS: InternetPlan[] = [
  { id: '1m', label: '1 month, 100 Mbps', amount: 1_500_00n },
  { id: '3m', label: '3 months, 100 Mbps', amount: 4_200_00n },
  { id: '12m', label: '12 months, 100 Mbps', amount: 15_000_00n },
];

export type LookupResult = { state: 'ready'; bill: Bill } | { state: 'empty'; customerName?: string } | { state: 'error'; message: string };

/** The biller's answer for a customer ID, or that nothing is due once it has been paid. */
export function lookupBill(service: Service, id: string, paid: readonly string[], planId = '1m'): LookupResult {
  const key = `${service}:${id}`;
  if (service === 'electricity') {
    if (id === '1111111') return { state: 'empty', customerName: 'Ramesh Adhikari' };
    if (id === '1234567')
      return paid.includes(key)
        ? { state: 'empty', customerName: 'Sita Sharma' }
        : {
            state: 'ready',
            bill: {
              customerName: 'Sita Sharma',
              period: 'Ashwin 2083',
              lines: [
                { id: 'energy', label: 'Energy charge', amount: 1_845_00n, detail: '212 units' },
                { id: 'service', label: 'Service charge', amount: 175_00n },
              ],
              adjustments: [{ id: 'rebate', label: 'Early payment rebate (2%)', amount: -40_40n }],
              dueDate: '2026-11-15',
              status: 'unpaid',
            },
          };
    if (id === '7654321')
      return paid.includes(key)
        ? { state: 'empty', customerName: 'Gopal Thapa' }
        : {
            state: 'ready',
            bill: {
              customerName: 'Gopal Thapa',
              period: 'Bhadra 2083',
              lines: [
                { id: 'energy', label: 'Energy charge', amount: 2_310_00n, detail: '268 units' },
                { id: 'service', label: 'Service charge', amount: 175_00n },
              ],
              adjustments: [{ id: 'fine', label: 'Late fine (5%)', amount: 124_25n }],
              dueDate: '2026-10-17',
              status: 'overdue',
            },
          };
    return { state: 'error', message: 'No customer with that ID at this counter. Check the counter and the ID on your meter card.' };
  }
  if (service === 'water') {
    if (id !== '20145') return { state: 'error', message: 'No customer with that number at this branch.' };
    if (paid.includes(key)) return { state: 'empty', customerName: 'Sita Sharma' };
    return {
      state: 'ready',
      bill: {
        customerName: 'Sita Sharma',
        period: 'Ashwin 2083',
        lines: [
          { id: 'water', label: 'Water charge', amount: 640_00n, detail: '18 units' },
          { id: 'sewer', label: 'Sewerage charge', amount: 320_00n },
          { id: 'meter', label: 'Meter rent', amount: 25_00n },
        ],
        adjustments: [],
        dueDate: '2026-11-20',
        status: 'unpaid',
      },
    };
  }
  if (id.trim().toLowerCase() !== 'sita_home') return { state: 'error', message: 'No account with that username at this provider.' };
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0]!;
  return {
    state: 'ready',
    bill: {
      customerName: 'Sita Sharma',
      period: `Renewal: ${plan.label}`,
      lines: [{ id: plan.id, label: plan.label, amount: plan.amount, detail: 'Taxes included' }],
      adjustments: plan.id === '12m' ? [{ id: 'offer', label: 'Annual plan discount', amount: -1_000_00n }] : [],
      dueDate: '2026-11-05',
      status: 'unpaid',
    },
  };
}
