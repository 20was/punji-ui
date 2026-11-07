import { ChartA11yShell, ChartDataTable } from '@punji/ui/chart-a11y';

const data = [
  { key: 'a', label: 'Mon', value: 40 },
  { key: 'b', label: 'Tue', value: 72 },
  { key: 'c', label: 'Wed', value: 55 },
  { key: 'd', label: 'Thu', value: 90 },
];

// Any renderer works: here, plain divs. A canvas or a charting library is wrapped the same way.
export default function Example() {
  return (
    <ChartA11yShell
      label="Orders per day"
      roleDescription="bar chart"
      count={data.length}
      speak={(i) => `${data[i]!.label}: ${data[i]!.value} orders`}
      summary="Four days, from 40 to 90 orders."
      table={<ChartDataTable caption="Orders per day" head={['Day', 'Orders']} rows={data.map((d) => ({ key: d.key, head: d.label, cells: [d.value] }))} />}
    >
      {({ index, plotProps }) => (
        <div {...plotProps()} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: 8 }}>
          {data.map((d, i) => (
            <div
              key={d.key}
              aria-hidden="true"
              style={{ flex: 1, height: `${d.value}%`, background: 'var(--pu-color-chart)', opacity: index === null || index === i ? 1 : 0.4, borderRadius: 4 }}
            />
          ))}
        </div>
      )}
    </ChartA11yShell>
  );
}
