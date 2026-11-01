import { LoanCalculator } from '@punji/ui/loan-calculator';

// 25 lakh at 11.5% for 20 years. Every figure is exact bigint arithmetic; try a part-prepayment after instalment 12.
export default function Example() {
  return <LoanCalculator title="Home loan" defaultAmount="2500000" defaultRatePercent="11.5" defaultMonths={240} />;
}
