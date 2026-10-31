import { ColumnChart } from '@punji/ui/column-chart';
import { formatCompactMoney, nepalMoneyConfig } from '@punji/ui/money';
import { revenueByYear } from '../../sample.ts';

const config = nepalMoneyConfig();
// Chart values are display numbers; the exact ledger stays in bigint elsewhere.
const format = (rupees: number) => formatCompactMoney(BigInt(Math.round(rupees * 100)), config);

export default function Example() {
  return (
    <ColumnChart
      label="Revenue by fiscal year, interest and fees"
      series={[
        { key: 'interest', label: 'Interest income', tone: 'chart' },
        { key: 'fees', label: 'Fees', tone: 'series2' },
      ]}
      columns={revenueByYear.map((y) => ({ key: y.key, label: y.label, short: y.short, values: [...y.values] }))}
      format={format}
      legend
    />
  );
}
