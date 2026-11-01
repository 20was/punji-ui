import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CompanySearch } from '@punji/ui/company-search';
import { SegmentedControl } from '@punji/ui/controls';
import { PriceField, SymbolField } from '@punji/ui/fields';
import { formatPrice } from '@punji/ui/nepal/market-format';
import { StatusPill } from '@punji/ui/status-pill';
import { Watchlist } from '@punji/ui/watchlist';
import { ScreenTitle } from '../shared/kit.tsx';
import { COMPANIES, companyOf } from './market.ts';
import { parsePrice, quoteMoney, rs, signedPct, usePortal, type PriceAlert } from './store.ts';

const OPTIONS = COMPANIES.map((c) => ({ symbol: c.symbol, name: c.name, sector: c.sector }));


/** The symbols someone follows, in their order, at live prices, and price alerts that fire as the market moves. */
export default function WatchlistScreen() {
  const { state, derived, dispatch, open } = usePortal();
  const [symbol, setSymbol] = useState(state.symbol);
  const [condition, setCondition] = useState<PriceAlert['condition']>('above');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<{ symbol?: string; price?: string }>({});
  const quotes = state.watchlist.map((s) => derived.bySymbol.get(s)).filter((q) => q !== undefined);
  const picked = derived.bySymbol.get(symbol.toUpperCase());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    const paisa = parsePrice(price);
    if (!picked) next.symbol = 'Choose a listed company, for example NABIL.';
    if (paisa === null || paisa <= 0n) next.price = 'Enter a price in rupees, for example 512.30.';
    else if (picked && condition === 'above' && paisa <= picked.ltp) next.price = `It is already above that: the price is ${rs(picked.ltp)}. Choose a higher price.`;
    else if (picked && condition === 'below' && paisa >= picked.ltp) next.price = `It is already below that: the price is ${rs(picked.ltp)}. Choose a lower price.`;
    setErrors(next);
    if (next.symbol || next.price || !picked || paisa === null) return;
    dispatch({ type: 'alert-add', symbol: picked.symbol, condition, price: paisa });
    setPrice('');
  };

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-small app-muted">{state.watchlist.length} symbols · {state.alerts.filter((a) => a.status === 'active').length} alerts set</span>}>Watchlist</ScreenTitle>
      <div className="app-grid is-split">
        <div className="app-stack">
          <div className="mp-co-search">
            <CompanySearch
              options={OPTIONS.filter((o) => !state.watchlist.includes(o.symbol))}
              label="Add to the watchlist"
              placeholder="Symbol or name"
              onOpen={(s) => dispatch({ type: 'watch', symbol: s })}
              sub={(o) => `${o.name} · ${o.sector}`}
              none={(q) => `No listed company matches “${q}”.`}
              size="md"
              shortcut={null}
              testId="mp-wl-search"
              optionTestId="mp-wl-opt"
            />
          </div>
          <Watchlist
            quotes={quotes}
            label="My watchlist"
            money={quoteMoney}
            live={state.running && !state.feedDown}
            onReorder={(symbols) => dispatch({ type: 'reorder', symbols })}
            onRemove={(s) => dispatch({ type: 'watch', symbol: s })}
            renderSymbol={(q) => (
              <button type="button" className="app-sym" onClick={() => open(q.symbol)}>
                <strong>{q.symbol}</strong>
                <span>{q.name}</span>
              </button>
            )}
            emptyTitle="Your watchlist is empty"
            emptyBody="Add a company above, or press Watch on a company page. Setting an alert adds its company too."
            testId="mp-watchlist"
          />
        </div>
        <Card title="Price alerts" description="Checked on every tick of the live session" headingLevel={3} testId="mp-alerts">
          <form className="mp-alert-form" onSubmit={submit} noValidate>
            <SymbolField label="Company" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} options={OPTIONS} error={errors.symbol} hint={picked ? `Now ${rs(picked.ltp)}` : undefined} size="md" testId="mp-alert-symbol" />
            <SegmentedControl<PriceAlert['condition']> label="When the price goes" prefix="mp-alert-cond" size="sm" value={condition} onChange={setCondition} options={[{ value: 'above', label: 'At or above' }, { value: 'below', label: 'At or below' }]} />
            <PriceField label="Price (Rs)" value={price} onChange={setPrice} inputMode="decimal" error={errors.price} size="md" testId="mp-alert-price" />
            <Button type="submit" size="sm" testId="mp-alert-add">
              Set alert
            </Button>
          </form>
          {state.alerts.length === 0 ? (
            <p className="app-muted">No alerts yet. Set one above: it fires once, announces itself and stays here until you remove or set it again.</p>
          ) : (
            <ul className="mp-alerts" aria-label="Alerts">
              {state.alerts.map((a) => {
                const q = derived.bySymbol.get(a.symbol);
                const gap = q && q.ltp > 0n ? (Number(a.price - q.ltp) / Number(q.ltp)) * 100 : 0;
                return (
                  <li key={a.id} data-testid={`mp-alert-${a.id}`}>
                    <div className="mp-alert-what">
                      <strong>{a.symbol}</strong> {a.condition === 'above' ? 'at or above' : 'at or below'} Rs {formatPrice(Number(a.price) / 100)}
                      <span className="mp-sub">
                        {a.status === 'triggered' ? `Fired at ${a.firedAt} at ${rs(a.firedPrice ?? 0n)}` : q ? `${signedPct(gap)} from ${rs(q.ltp)}` : companyOf(a.symbol)?.name}
                      </span>
                    </div>
                    <StatusPill tone={a.status === 'triggered' ? 'warn' : 'info'} size="sm">
                      {a.status === 'triggered' ? 'Fired' : 'Active'}
                    </StatusPill>
                    <div className="mp-alert-actions">
                      {a.status === 'triggered' && (
                        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'alert-rearm', id: a.id })}>
                          Set again<span className="kit-sr"> {a.symbol}</span>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'alert-remove', id: a.id })}>
                        Remove<span className="kit-sr"> alert for {a.symbol}</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
