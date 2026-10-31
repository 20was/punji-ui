import { ColumnChart } from '@punji/ui/column-chart';

export default function Example() {
  return (
    <ColumnChart
      label="Quarterly profit and one-off loss"
      series={[
        { key: 'op', label: 'Operating profit', tone: 'gain' },
        { key: 'one', label: 'One-off', tone: 'loss' },
      ]}
      columns={[
        { key: 'q1', label: 'Q1', values: [40, -5] },
        { key: 'q2', label: 'Q2', values: [55, -30] },
        { key: 'q3', label: 'Q3', values: [48, 0] },
        { key: 'q4', label: 'Q4', values: [20, -45] },
      ]}
      format={(v) => `Rs ${v} M`}
    />
  );
}
