import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { SegmentedControl } from '@punji/ui/controls';
import { Field } from '@punji/ui/fields';
import { Delta } from '@punji/ui/figures';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Switch } from '@punji/ui/switch';
import { FinancialTable } from '@punji/ui/financial';
import { themeAttributes, type Density } from '@punji/ui/theme';

type Scheme = 'light' | 'dark';
type Contrast = 'normal' | 'more';
type Dir = 'ltr' | 'rtl';

const rows = [
  { symbol: 'NABIL', units: 120, change: 2.41 },
  { symbol: 'NTC', units: 40, change: -1.18 },
  { symbol: 'HDL', units: 15, change: 0 },
];

/** Theme, contrast, density and direction applied to one preview panel with themeAttributes. */
export default function Example() {
  const [scheme, setScheme] = useState<Scheme>('light');
  const [contrast, setContrast] = useState<Contrast>('normal');
  const [density, setDensity] = useState<Density>('comfortable');
  const [dir, setDir] = useState<Dir>('ltr');
  const [alerts, setAlerts] = useState(true);
  const [symbol, setSymbol] = useState('NABIL');
  const attrs = themeAttributes({ theme: scheme, contrast, density });
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <SegmentedControl<Scheme> label="Theme" prefix="mode-theme" size="sm" value={scheme} onChange={setScheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <SegmentedControl<Contrast> label="Contrast" prefix="mode-contrast" size="sm" value={contrast} onChange={setContrast} options={[{ value: 'normal', label: 'Standard' }, { value: 'more', label: 'High' }]} />
        <SegmentedControl<Density> label="Density" prefix="mode-density" size="sm" value={density} onChange={setDensity} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]} />
        <SegmentedControl<Dir> label="Direction" prefix="mode-dir" size="sm" value={dir} onChange={setDir} options={[{ value: 'ltr', label: 'LTR' }, { value: 'rtl', label: 'RTL' }]} />
      </div>
      <div {...attrs} dir={dir} style={{ display: 'grid', gap: 12, padding: 'var(--pu-space-4)', borderRadius: 'var(--pu-radius-lg)', border: '1px solid var(--pu-color-card-border)', background: 'var(--pu-color-bg)', color: 'var(--pu-color-text)' }}>
        <code style={{ fontSize: 12, color: 'var(--pu-color-text-muted)' }}>{Object.entries({ ...attrs, dir }).map(([k, v]) => `${k}="${v}"`).join(' ')}</code>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12 }}>
          <div style={{ flex: '1 1 12rem' }}>
            <Field label="Symbol" value={symbol} onChange={setSymbol} />
          </div>
          <Button>Buy</Button>
          <Button variant="secondary">Sell</Button>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch checked={alerts} onChange={setAlerts} label="Price alerts" /> Price alerts
        </span>
        <p style={{ margin: 0 }}>
          Cash <MoneyDisplay value={-4875050n} currency="NPR" locale="en-IN" />
        </p>
        <FinancialTable
          caption="Holdings"
          rows={rows}
          rowKey={(r) => r.symbol}
          emptyTitle="No holdings"
          columns={[
            { key: 'symbol', label: 'Symbol', rowHeader: true, render: (r) => r.symbol },
            { key: 'units', label: 'Units', num: true, render: (r) => String(r.units) },
            { key: 'change', label: 'Change', num: true, render: (r) => <Delta value={r.change} kind="pct" /> },
          ]}
        />
      </div>
    </div>
  );
}
