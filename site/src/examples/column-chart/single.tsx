import { ColumnChart } from '@punji/ui/column-chart';

export default function Example() {
  return (
    <ColumnChart
      label="Dividends per share by year"
      series={[{ key: 'd', label: 'Dividend', tone: 'chart' }]}
      columns={[
        { key: '80', label: '2080/81', values: [12] },
        { key: '81', label: '2081/82', values: [15.5] },
        { key: '82', label: '2082/83', values: [null] },
      ]}
      format={(v) => `Rs ${v.toFixed(2)}`}
      labels={{ none: 'not declared' }}
    />
  );
}
