import { useState } from 'react';
import { SplitBar } from '@punji/ui/bars';
import { Button } from '@punji/ui/button';
import { percentageChange } from '@punji/ui/calculations';
import { Card } from '@punji/ui/card';
import { CheckList, CheckRow } from '@punji/ui/check-row';
import { CompanySearch } from '@punji/ui/company-search';
import { StateGlyph } from '@punji/ui/inline-state';
import { KeyStats } from '@punji/ui/key-stats';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { PriceLimitIndicator, circuitLimits } from '@punji/ui/price-limit';
import { StatusPill } from '@punji/ui/status-pill';
import { Watchlist } from '@punji/ui/watchlist';
import { quotes, symbols } from '../../sample.ts';
import './screen.css';

// A watchlist with price alerts. The list is yours: Watchlist only asks to reorder or remove, CompanySearch asks to
// add. Choosing a symbol opens its panel: the quote, how far it sits inside today's circuit band and its alerts.
const npr = nepalMoneyConfig();
const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

interface Alert {
  id: string;
  symbol: string;
  side: 'above' | 'below';
  /** Paisa. */
  target: bigint;
}
const ALERTS: Alert[] = [
  { id: 'a1', symbol: 'NABIL', side: 'above', target: 49_000n },
  { id: 'a2', symbol: 'NABIL', side: 'below', target: 46_500n },
  { id: 'a3', symbol: 'UPPER', side: 'above', target: 39_500n },
  { id: 'a4', symbol: 'NICA', side: 'below', target: 52_000n },
  { id: 'a5', symbol: 'HDL', side: 'above', target: 220_000n },
];

export default function Example() {
  const [list, setList] = useState(['NABIL', 'NICA', 'UPPER', 'HDL', 'CHCL', 'NTC']);
  const [picked, setPicked] = useState('NABIL');
  const rows = list.map((s) => bySymbol.get(s)!).filter(Boolean);
  const quote = bySymbol.get(picked) ?? rows[0];
  const rose = rows.filter((q) => q.ltp !== null && q.previousClose !== null && q.ltp > q.previousClose).length;
  const fell = rows.filter((q) => q.ltp !== null && q.previousClose !== null && q.ltp < q.previousClose).length;
  const band = quote?.previousClose ? circuitLimits(quote.previousClose, '0.10') : null;
  const alerts = ALERTS.filter((a) => a.symbol === quote?.symbol);

  return (
    <div className="sc-wl">
      <div className="sc-wl-head">
        <div className="sc-wl-title">
          <h3>Watchlist</h3>
          <StatusPill size="sm">{rows.length} companies</StatusPill>
        </div>
        <div className="sc-wl-add">
          <CompanySearch
            options={symbols.filter((o) => !list.includes(o.symbol))}
            label="Add a company"
            hideLabel
            placeholder="Add a company to the watchlist"
            size="sm"
            shortcut={null}
            clearOnOpen
            onOpen={(symbol) => {
              setList((current) => (current.includes(symbol) ? current : [...current, symbol]));
              setPicked(symbol);
            }}
            sub={(o) => o.name}
            none={(q) => `No company matches “${q}”.`}
            testId="wl-add"
            optionTestId="wl-add-option"
          />
        </div>
      </div>

      <div className="sc-wl-grid">
        <div className="sc-wl-list">
          <Card title="Today" description={`${rose} rose, ${fell} fell, ${rows.length - rose - fell} unchanged`} headingLevel={3}>
            <div className="sc-wl-stack">
              <SplitBar
                parts={[
                  { key: 'up', value: rose, tone: 'gain', label: `${rose} rose` },
                  { key: 'flat', value: rows.length - rose - fell, tone: 'neutral', label: `${rows.length - rose - fell} unchanged` },
                  { key: 'down', value: fell, tone: 'loss', label: `${fell} fell` },
                ]}
              />
              <Watchlist
                quotes={rows}
                label="My watchlist"
                showTrend
                renderSymbol={(q) => (
                  <Button variant="ghost" size="sm" aria-pressed={q.symbol === quote?.symbol} onClick={() => setPicked(q.symbol)}>
                    {q.symbol}
                  </Button>
                )}
                onReorder={(next) => setList(next)}
                onRemove={(symbol) => setList((current) => current.filter((s) => s !== symbol))}
                emptyTitle="Nothing on your watchlist"
                emptyBody="Search above to follow a company."
              />
            </div>
          </Card>
        </div>

        {quote && (
          <div className="sc-wl-side">
            <Card title={quote.symbol} description={quote.name} headingLevel={3} action={<StatusPill size="sm">{quote.sector}</StatusPill>}>
              <div className="sc-wl-stack">
                <div className="sc-wl-quote">
                  <span className="sc-wl-price">
                    <MoneyDisplay value={quote.ltp} preset={npr} />
                  </span>
                  <PriceChange current={quote.ltp} previous={quote.previousClose} preset={npr} />
                </div>
                <PriceLimitIndicator symbol={quote.symbol} ltp={quote.ltp} previousClose={quote.previousClose} lowerLimit={band?.lower} upperLimit={band?.upper} />
                <KeyStats
                  cols={2}
                  label={`${quote.symbol} session`}
                  empty="Not published"
                  items={[
                    { label: 'Turnover', value: <MoneyDisplay value={quote.turnover} preset={npr} compact /> },
                    { label: 'Volume', value: quote.volume?.toLocaleString('en-IN') ?? null },
                  ]}
                />
              </div>
            </Card>
            <Card
              title="Alerts"
              description={alerts.length ? `${alerts.length} set on ${quote.symbol}` : `None set on ${quote.symbol}`}
              headingLevel={3}
              action={
                <Button size="sm" variant="secondary">
                  New alert
                </Button>
              }
            >
              {alerts.length > 0 ? (
                <CheckList label={`Alerts on ${quote.symbol}`}>
                  {alerts.map((a) => {
                    const away = quote.ltp === null ? null : percentageChange(a.target, quote.ltp);
                    const hit = quote.ltp !== null && (a.side === 'above' ? quote.ltp >= a.target : quote.ltp <= a.target);
                    return (
                      <CheckRow
                        key={a.id}
                        icon={<StateGlyph name="bell" size={18} />}
                        tone={hit ? 'warn' : 'info'}
                        title={`${a.side === 'above' ? 'Rises above' : 'Falls below'} ${formatMoney(a.target, npr)}`}
                        line={away === null ? 'No price yet' : `${Math.abs(away).toFixed(2)}% from the last price`}
                        status={hit ? { label: 'Triggered', tone: 'warn' } : { label: 'Waiting' }}
                      />
                    );
                  })}
                </CheckList>
              ) : (
                <p className="sc-wl-empty">Set a level and hear the moment {quote.symbol} reaches it.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
