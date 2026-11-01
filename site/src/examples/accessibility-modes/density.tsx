import { Button } from '@punji/ui/button';
import { Field } from '@punji/ui/fields';
import { FinancialTable } from '@punji/ui/financial';
import { DENSITIES, type Density } from '@punji/ui/theme';

const rows = [
  { symbol: 'NABIL', ltp: '547.00' },
  { symbol: 'NTC', ltp: '912.40' },
];

const Panel = ({ density }: { density: Density }) => (
  <div data-pu-density={density} style={{ display: 'grid', gap: 8, minWidth: 0 }}>
    <code style={{ fontSize: 12, color: 'var(--pu-color-text-muted)' }}>data-pu-density="{density}"</code>
    <Field label={`Symbol (${density})`} value="NABIL" onChange={() => undefined} />
    <span style={{ display: 'flex', gap: 8 }}>
      <Button size="sm">Buy</Button>
      <Button size="sm" variant="secondary">Sell</Button>
    </span>
    <FinancialTable
      caption={`Prices, ${density}`}
      rows={rows}
      rowKey={(r) => r.symbol}
      emptyTitle="No prices"
      columns={[
        { key: 'symbol', label: 'Symbol', rowHeader: true, render: (r) => r.symbol },
        { key: 'ltp', label: 'LTP', num: true, render: (r) => r.ltp },
      ]}
    />
  </div>
);

/** Compact for trading screens, comfortable (the default) for banking, spacious for touch-first and low-vision use. */
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))' }}>
      {DENSITIES.map((density) => (
        <Panel key={density} density={density} />
      ))}
    </div>
  );
}
