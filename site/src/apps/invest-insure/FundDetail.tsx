import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { FactList } from '@punji/ui/fact-list';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PerformanceChart } from '@punji/ui/performance-chart';
import { RiskMeter, riskLevelLabels } from '@punji/ui/risk-meter';
import { EmptyState } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { CATEGORY_LABEL, FUNDS, NAV_DATES, fundById, fundReturn, navHistory, navText, type ReturnPeriod } from './data.ts';
import { Gain, Pct } from './bits.tsx';
import { holdingsOf, navUnits, npr, rs, useInvest } from './store.ts';

type Period = '1' | '3' | '5';

/** One fund: riskometer, NAV history, returns against its category, facts, your holding and the ways to invest. */
export default function FundDetail() {
  const { state, fundId, openFund, invest } = useInvest();
  const [period, setPeriod] = useState<Period>('3');
  const root = useRef<HTMLDivElement>(null);
  // Opening a fund replaces the list, so focus moves to the fund's heading.
  useEffect(() => root.current?.querySelector<HTMLElement>('[data-screen-title]')?.focus(), []);
  const fund = fundId ? fundById(fundId) : undefined;
  const chart = useMemo(() => {
    if (!fund) return null;
    const weeks = Number(period) * 52 + 1;
    const h = navHistory(fund.id);
    return { dates: NAV_DATES.slice(-weeks), values: h.slice(-weeks).map((n) => Number(n) / 10_000) };
  }, [fund, period]);
  if (!fund || !chart)
    return (
      <div className="app-stack">
        <ScreenTitle>Fund not found</ScreenTitle>
        <EmptyState title="This fund is not in the list" body="It may have been merged or closed." headingLevel={3} action={<Button size="sm" onClick={() => openFund(null)}>Back to funds</Button>} />
      </div>
    );
  const peers = FUNDS.filter((f) => f.category === fund.category && f.id !== fund.id);
  const average = (y: ReturnPeriod) => {
    const values = peers.map((p) => fundReturn(p.id, y)).filter((v): v is string => v !== null);
    if (values.length === 0) return null;
    // Basis points, so the average of two-place percents is exact before it is rounded to two places.
    const bp = values.reduce((s, v) => s + BigInt(Math.round(Number(v) * 100)), 0n);
    const avg = (bp * 2n + BigInt(values.length) * (bp >= 0n ? 1n : -1n)) / (2n * BigInt(values.length));
    const abs = avg < 0n ? -avg : avg;
    return `${avg < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
  };
  const holding = holdingsOf(state.txs).find((h) => h.fund.id === fund.id);

  return (
    <div className="app-stack" ref={root}>
      <div>
        <Button size="sm" variant="ghost" onClick={() => openFund(null)} testId="ii-fund-back">
          ← All funds
        </Button>
      </div>
      <ScreenTitle aside={<span className="app-muted app-small">{fund.house}</span>}>{fund.name}</ScreenTitle>
      <div className="app-grid is-split">
        <div className="app-stack">
          <Card title="NAV history" description={`NAV ${navText(navHistory(fund.id).at(-1)!)} on 1 Nov 2026 · weekly`} headingLevel={3}>
            <PerformanceChart
              label={`${fund.name} NAV, last ${period} year${period === '1' ? '' : 's'}`}
              dates={chart.dates}
              series={[{ key: 'nav', label: 'NAV (Rs)', values: chart.values, format: (v) => v.toFixed(4) }]}
              normalize={false}
              height={220}
              formatValue={(v) => v.toFixed(2)}
              periods={<SegmentedControl label="Period" prefix="ii-period" size="sm" value={period} onChange={setPeriod} options={[{ value: '1', label: '1Y' }, { value: '3', label: '3Y' }, { value: '5', label: '5Y' }]} />}
              testId="ii-nav-chart"
            />
          </Card>
          <Card title="Returns" description={`Annualised, against the ${CATEGORY_LABEL[fund.category].toLowerCase()} category average`} headingLevel={3}>
            <table className="ii-table" data-testid="ii-returns">
              <caption className="kit-sr">Returns of {fund.name} against its category</caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col" className="num">This fund</th>
                  <th scope="col" className="num">Category</th>
                </tr>
              </thead>
              <tbody>
                {([1, 3, 5] as ReturnPeriod[]).map((y) => (
                  <tr key={y}>
                    <th scope="row">{y} year{y > 1 ? 's' : ''}</th>
                    <td className="num"><Pct value={fundReturn(fund.id, y)} /></td>
                    <td className="num">{peers.length ? <Pct value={average(y)} /> : <span className="app-muted">No peers</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="app-stack">
          <Card title="Risk" headingLevel={3}>
            <RiskMeter level={fund.risk} caption={`Your principal will be at ${riskLevelLabels[fund.risk - 1]!.toLowerCase()} risk.`} testId="ii-risk" />
          </Card>
          <Card title="Invest" headingLevel={3}>
            <div className="app-stack">
              <FactList
                facts={[
                  { label: 'Minimum SIP', value: `${rs(fund.minSip)} a month` },
                  { label: 'Minimum lump sum', value: rs(fund.minLumpSum) },
                ]}
              />
              <div className="ii-buttons">
                <Button onClick={() => invest(fund.id, 'sip')} testId="ii-start-sip">Start a SIP</Button>
                <Button variant="secondary" onClick={() => invest(fund.id, 'lumpsum')} testId="ii-lumpsum">Invest once</Button>
              </div>
            </div>
          </Card>
          {holding && (
            <Card title="Your holding" headingLevel={3}>
              <FactList
                facts={[
                  { label: 'Units', value: navUnits(holding.units) },
                  { label: 'Current value', value: <MoneyDisplay value={holding.value} preset={npr} /> },
                  { label: 'Invested', value: <MoneyDisplay value={holding.invested} preset={npr} /> },
                  { label: 'Gain', value: <Gain value={holding.gain} /> },
                  { label: 'XIRR', value: <Pct value={holding.xirr} /> },
                ]}
              />
            </Card>
          )}
          <Card title="About the fund" headingLevel={3}>
            <FactList
              facts={[
                { label: 'Category', value: `${CATEGORY_LABEL[fund.category]}${fund.taxSaving ? ' (tax saving)' : ''}` },
                { label: 'Expense ratio', value: `${fund.expenseRatio}% a year` },
                { label: 'Exit load', value: fund.exitLoad },
                { label: 'Fund size', value: rs(fund.aum) },
                { label: 'Fund manager', value: fund.manager },
                { label: 'Benchmark', value: fund.benchmark },
                { label: 'Since', value: fund.inception },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
