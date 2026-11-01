import { DepositCalculator } from '@punji/ui/deposit-calculator';

// 5 lakh fixed for two years at 8.5%, interest credited quarterly with 6% TDS. Switch to a recurring deposit.
export default function Example() {
  return <DepositCalculator title="Deposit calculator" defaultAmount="500000" defaultRatePercent="8.5" defaultMonths={24} />;
}
