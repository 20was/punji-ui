import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { money } from '@punji/ui/money';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { SHARE_TONES, ShareBar, type ShareItem } from '@punji/ui/meter';
import { NetWorthChart, netWorthRows, type NetWorthPoint } from '@punji/ui/net-worth-chart';
import { RangeSelector, type ChartRange } from '@punji/ui/range-selector';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount } from '../shared/moneyCells.tsx';
import { CLASSES, WORTH, assetsOf, inRange, netOf, percentOf } from './finance.ts';

const RANGES: readonly ChartRange[] = ['1Y', 'YTD', 'All'];
const WORDS = { '1Y': { short: '1Y', long: 'Last 12 months' }, YTD: { short: 'YTD', long: 'This year so far' }, All: { short: 'All', long: 'All 24 months' } } as const;

/** Net worth over time, what it is made of today, and how much it moved in the chosen range. Exact: the change is
 *  the difference of two bigint net worths. */
export function Overview() {
  const [range, setRange] = useState<ChartRange>('1Y');
  const months = inRange(range);
  const points: NetWorthPoint[] = months.map((m) => ({ key: m.key, label: m.label, assets: money(assetsOf(m), 'NPR'), liabilities: money(m.loan, 'NPR') }));
  const first = months[0]!;
  const last = WORTH.at(-1)!;
  const rows = netWorthRows(points);
  const change = rows.at(-1)!.net - rows[0]!.net;
  const assets = assetsOf(last);
  const items: ShareItem[] = CLASSES.map((c, i) => ({ key: c.key, label: c.label, pct: percentOf(last[c.key], assets), tone: SHARE_TONES[i]!, testId: `pf-class-${c.key}` }));
  return (
    <div className="app-stack">
      <ScreenTitle>Overview</ScreenTitle>
      <MetricRow label={`Net worth, ${last.label}`} count={4} testId="pf-kpis">
        <MetricTile tone="inverse" label="Net worth" value={<Amount value={netOf(last)} plain testId="pf-kpi-net" />} note={last.label} />
        <MetricTile label={`Change since ${first.label}`} value={<Amount value={change} testId="pf-kpi-change" />} note={change >= 0n ? 'Up' : 'Down'} />
        <MetricTile label="Assets" value={<Amount value={assets} plain testId="pf-kpi-assets" />} note="Everything you own" />
        <MetricTile label="Owed" value={<Amount value={last.loan} plain testId="pf-kpi-owed" />} note="Home loan" />
      </MetricRow>
      <Card
        title="Net worth over time"
        description="Assets above the line, what you owe below it, net worth as the line."
        headingLevel={3}
        action={<RangeSelector value={range} onChange={setRange} ranges={RANGES} words={WORDS} label="Net worth range" testId="pf-range" />}
        testId="pf-networth"
      >
        <NetWorthChart points={points} label={`Net worth, ${first.label} to ${last.label}, NPR`} height={260} testId="pf-chart" />
      </Card>
      <Card title="What you own" description={`${last.label}. Share of assets by kind.`} headingLevel={3}>
        <ShareBar items={items} label={`Assets by kind, ${last.label}`} legend="list" testId="pf-assets" />
      </Card>
    </div>
  );
}
