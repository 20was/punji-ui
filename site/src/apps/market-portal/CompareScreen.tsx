import { useMemo, useState } from 'react';
import { Card } from '@punji/ui/card';
import { CompanySearch } from '@punji/ui/company-search';
import { SegmentedControl } from '@punji/ui/controls';
import { FilterChip } from '@punji/ui/filter-chip';
import { PerformanceChart, type PerformanceSeries } from '@punji/ui/performance-chart';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { COMPANIES, companyOf, indexHistory, yearOf } from './market.ts';
import { MAX_COMPARE, signedPct, usePortal } from './store.ts';

const RANGES = { '1M': 21, '3M': 63, '6M': 125, '1Y': 250 } as const;
type Range = keyof typeof RANGES;
const OPTIONS = COMPANIES.map((c) => ({ symbol: c.symbol, name: c.name, sector: c.sector }));

/** Up to five companies against the NEPSE index, as percent change from the start of the period, today live. */
export default function CompareScreen() {
  const { state, derived, dispatch, open } = usePortal();
  const [range, setRange] = useState<Range>('3M');
  const n = RANGES[range];
  const index = indexHistory();
  const dates = useMemo(() => [...index.slice(-n).map((d) => d.date), SESSION_DATE], [index, n]);
  const series = useMemo<PerformanceSeries[]>(() => {
    const out: PerformanceSeries[] = state.compare.map((symbol) => {
      const q = derived.bySymbol.get(symbol)!;
      return { key: symbol, label: symbol, values: [...yearOf(companyOf(symbol)!).slice(-n).map((d) => d.close), Number(q.ltp) / 100] };
    });
    out.push({ key: 'NEPSE', label: 'NEPSE index', values: [...index.slice(-n).map((d) => d.value), derived.index.value] });
    return out;
  }, [state.compare, derived, index, n]);
  const returns = series.map((s) => ({ key: s.key, label: s.label, pct: ((s.values.at(-1)! - s.values[0]!) / s.values[0]!) * 100 })).toSorted((a, b) => b.pct - a.pct);
  const full = state.compare.length >= MAX_COMPARE;

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-small app-muted">{state.compare.length} of {MAX_COMPARE} companies</span>}>Compare</ScreenTitle>
      <div className="mp-filters" role="group" aria-label="Companies compared">
        {state.compare.map((s) => (
          <FilterChip key={s} label={s} value={companyOf(s)?.name} removeLabel={`Remove ${s} from the comparison`} onRemove={() => dispatch({ type: 'compare-remove', symbol: s })} testId={`mp-cmp-${s}`} />
        ))}
        {full ? (
          <p className="app-small app-muted" data-testid="mp-cmp-full">Compare holds {MAX_COMPARE} companies. Remove one to add another.</p>
        ) : (
          <div className="mp-co-search">
            <CompanySearch
              options={OPTIONS.filter((o) => !state.compare.includes(o.symbol))}
              label="Add a company"
              placeholder="Symbol or name"
              onOpen={(s) => dispatch({ type: 'compare-add', symbol: s })}
              sub={(o) => `${o.name} · ${o.sector}`}
              none={(q) => `No listed company matches “${q}”.`}
              size="md"
              shortcut={null}
              testId="mp-cmp-search"
              optionTestId="mp-cmp-opt"
            />
          </div>
        )}
      </div>
      <Card
        title="Performance"
        description="Percent change from the first session shown; today is live"
        headingLevel={3}
        action={<SegmentedControl<Range> label="Period" prefix="mp-cmp-range" size="sm" value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: value }))} />}
      >
        <PerformanceChart dates={dates} series={series} label={`${state.compare.join(', ') || 'No companies'} against the NEPSE index, ${range}`} height={320} area={false} testId="mp-cmp-chart" />
        {state.compare.length === 0 && <p className="app-muted">Only the index is drawn. Add a company above, or press Compare on a company page.</p>}
      </Card>
      <Card title={`Return over ${range}`} headingLevel={3}>
        <ol className="mp-returns" data-testid="mp-cmp-returns">
          {returns.map((r) => (
            <li key={r.key}>
              {r.key === 'NEPSE' ? (
                <span className="mp-returns-name">{r.label}</span>
              ) : (
                <button type="button" className="app-sym" onClick={() => open(r.key)}>
                  <strong>{r.label}</strong>
                  <span>{companyOf(r.key)?.name}</span>
                </button>
              )}
              <span className="mp-returns-pct" data-dir={r.pct > 0 ? 'up' : r.pct < 0 ? 'down' : 'flat'}>
                {r.pct > 0 ? '▲' : r.pct < 0 ? '▼' : '■'} {signedPct(r.pct)}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
