import { EarningsChart } from '@punji/ui/earnings-chart';

// EPS as decimal strings: exact, never a float. The last quarter has an estimate only.
export default function Example() {
  return (
    <EarningsChart
      label="Earnings per share, last six quarters"
      currency="NPR"
      periods={[
        { key: 'q1', label: 'Q1 FY25', estimate: '4.10', actual: '4.38' },
        { key: 'q2', label: 'Q2 FY25', estimate: '4.35', actual: '4.30' },
        { key: 'q3', label: 'Q3 FY25', estimate: '4.60', actual: '4.95' },
        { key: 'q4', label: 'Q4 FY25', estimate: '5.20', actual: '4.72' },
        { key: 'q1n', label: 'Q1 FY26', estimate: '4.80', actual: '4.80' },
        { key: 'q2n', label: 'Q2 FY26', estimate: '5.05' },
      ]}
    />
  );
}
