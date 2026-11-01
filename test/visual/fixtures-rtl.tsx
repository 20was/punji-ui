// Right to left, high contrast and density. The RTL fixture draws the pieces most likely to break under
// dir="rtl" (chevrons, pagination, switches, sliders, meters, net bars, pinned and numeric table columns,
// amounts with signs) in an Arabic-labelled block, beside the same block in LTR for comparison.
// The modes fixture draws a small screen in every density and in both high-contrast themes.
// Baselines are pending (manifest `pending`): record them with `npm run test:visual:update`.
import { useState, type ReactNode } from 'react';
import {
  Button, Card, CardLink, CheckRow, DataRow, DataRows, Delta, Field, FinancialTable, MeterBar, MoneyDisplay, NetBar, NetBarHead, Pagination, PriceChange,
  RangeSlider, RowList, SegmentedControl, Switch, ValueRow, nepalMoneyConfig,
} from '@punji/ui';
import { holdings } from '../../fixtures/market-data.ts';

const noop = () => undefined;
const npr = nepalMoneyConfig();
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Glyph = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>;

function Sample({ dir, lang, t }: { dir: 'rtl' | 'ltr'; lang: string; t: Record<string, string> }) {
  const [seg, setSeg] = useState('all');
  const [on, setOn] = useState(true);
  const [range, setRange] = useState<[number, number]>([200, 700]);
  return (
    <div dir={dir} lang={lang} style={{ display: 'grid', gap: 16, minWidth: 0 }} data-testid={`vr-rtl-${dir}`}>
      <Block title={t.money!}>
        <MoneyDisplay preset={npr} value={-4875050n} />
        <PriceChange preset={npr} current={48750n} previous={48140n} />
        <PriceChange preset={npr} current={84200n} previous={84600n} />
        <span><Delta value={2.41} kind="pct" /> <Delta value={-1.2} kind="pct" /></span>
      </Block>
      <Block title={t.controls!}>
        <SegmentedControl options={[{ value: 'all', label: t.all! }, { value: 'gain', label: t.gainers! }, { value: 'loss', label: t.losers! }]} value={seg} onChange={setSeg} prefix={`vr-rtl-seg-${dir}`} label={t.controls!} />
        <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Switch checked={on} onChange={setOn} label={t.alerts!} /><Switch checked={false} onChange={noop} label={t.alerts!} /></span>
        <Field label={t.symbol!} value="NABIL" onChange={noop} />
        <RangeSlider min={0} max={1000} step={10} lo={range[0]} hi={range[1]} onChange={(lo, hi) => setRange([lo, hi])} labelLo={t.min!} labelHi={t.max!} valueText={(v) => `NPR ${v}`} testId={`vr-rtl-range-${dir}`} />
        <span style={{ display: 'flex', gap: 8 }}><Button size="sm">{t.buy}</Button><Button size="sm" variant="secondary">{t.sell}</Button></span>
      </Block>
      <Block title={t.progress!}>
        <MeterBar parts={[{ value: 62, tone: 'gain' }, { value: 20, tone: 'loss' }]} max={100} marker={50} label="62 / 20" />
        <div style={{ font: '600 12px var(--pu-font-body)', color: 'var(--pu-color-text-muted)' }}><NetBarHead left={t.sold!} right={t.bought!} /></div>
        <NetBar value={42_000} max={100_000} text="+42,000" />
      </Block>
      <Block title={t.rows!}>
        <Card flush><RowList label={t.rows!}>{holdings.slice(0, 2).map((h) => <ValueRow key={h.symbol} symbol={h.symbol} name={h.name} line={`${h.qty}`} figure={String(h.ltp)} chevron onClick={noop} />)}</RowList></Card>
        <DataRows label={t.rows!} flush><DataRow label={t.cost!} value="Rs 10,50,000" /><DataRow label={t.value!} value="Rs 12,48,350" /></DataRows>
        <CheckRow icon={<Glyph />} tone="gain" title={t.check!} line="7" figure="7" onClick={noop} />
        <CardLink href="#open">{t.open}</CardLink>
      </Block>
      <Block title={t.table!}>
        <FinancialTable caption={t.table!} rows={holdings.slice(0, 3)} rowKey={(h) => h.symbol} emptyTitle="-" sort={{ key: 'symbol', dir: 'asc' }} onSort={noop} columns={[
          { key: 'symbol', label: t.symbol!, rowHeader: true, sortable: true, render: (h) => h.symbol },
          { key: 'units', label: t.units!, num: true, render: (h) => String(h.qty) },
          { key: 'ltp', label: t.price!, num: true, render: (h) => h.ltp.toFixed(2) },
        ]} />
        <Pagination page={2} total={30} pageSize={10} onPageChange={noop} label={t.pages!} />
      </Block>
    </div>
  );
}

const ar = { money: 'المبالغ', controls: 'عناصر التحكم', all: 'الكل', gainers: 'الرابحون', losers: 'الخاسرون', alerts: 'تنبيهات الأسعار', symbol: 'الرمز', min: 'الحد الأدنى', max: 'الحد الأقصى', buy: 'شراء', sell: 'بيع', progress: 'التقدم', sold: 'مباع', bought: 'مشترى', rows: 'الصفوف', cost: 'التكلفة', value: 'القيمة', check: 'التنويع', open: 'فتح', table: 'المحفظة', units: 'الوحدات', price: 'السعر', pages: 'الصفحات' };
const en = { money: 'Amounts', controls: 'Controls', all: 'All', gainers: 'Gainers', losers: 'Losers', alerts: 'Price alerts', symbol: 'Symbol', min: 'Minimum', max: 'Maximum', buy: 'Buy', sell: 'Sell', progress: 'Progress', sold: 'Sold', bought: 'Bought', rows: 'Rows', cost: 'Cost', value: 'Value', check: 'Diversification', open: 'Open', table: 'Portfolio', units: 'Units', price: 'Price', pages: 'Pages' };

function RtlFixture() {
  return <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' }}>
    <Sample dir="rtl" lang="ar" t={ar} />
    <Sample dir="ltr" lang="en" t={en} />
  </div>;
}

function ModesSample({ theme, density }: { theme?: string; density?: string }) {
  return (
    <div data-theme={theme} data-pu-density={density} style={{ display: 'grid', gap: 10, padding: 12, background: 'var(--pu-color-bg)', color: 'var(--pu-color-text)', borderRadius: 'var(--pu-radius-lg)' }}>
      <h3 className="vr-h">{[theme ?? 'page theme', density ?? 'comfortable'].join(' · ')}</h3>
      <Field label="Symbol" value="NABIL" onChange={noop} />
      <span style={{ display: 'flex', gap: 8 }}><Button size="sm">Buy</Button><Button size="sm" variant="secondary">Sell</Button><Button size="sm" variant="ghost">Cancel</Button></span>
      <FinancialTable caption="Holdings" rows={holdings.slice(0, 3)} rowKey={(h) => h.symbol} emptyTitle="-" columns={[
        { key: 'symbol', label: 'Symbol', rowHeader: true, render: (h) => h.symbol },
        { key: 'change', label: 'Change', num: true, render: (h) => <Delta value={h.change} kind="pct" /> },
      ]} />
    </div>
  );
}

function ModesFixture() {
  return <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))' }}>
    <ModesSample density="compact" />
    <ModesSample />
    <ModesSample density="spacious" />
    <ModesSample theme="light-hc" />
    <ModesSample theme="dark-hc" density="compact" />
  </div>;
}

export const rtlRegistry: Record<string, () => ReactNode> = {
  rtl: RtlFixture,
  'theme-modes': ModesFixture,
};
