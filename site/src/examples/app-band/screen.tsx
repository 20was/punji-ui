import { Button } from '@punji/ui/button';
import { CheckList, CheckRow } from '@punji/ui/check-row';
import { Delta, Figure } from '@punji/ui/figures';
import { StateGlyph } from '@punji/ui/inline-state';
import { MarketStatus, getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { RowList, Tile, ValueRow } from '@punji/ui/rows';
import { Sparkline } from '@punji/ui/sparkline';
import { StatusPill } from '@punji/ui/status-pill';
import { Watchlist } from '@punji/ui/watchlist';
import { holdings, nabilCloses, quotes, sampleNow } from '../../sample.ts';
import './screen.css';

// A mobile-app promotion band (the portal's "app strip"): what the phone does best, the download actions and two
// screens of the app, each drawn with the same components the app uses. The screens are pictures here, so they are
// inert: not focusable and not announced twice. The band forces the dark theme on its own subtree with data-theme.
const npr = nepalMoneyConfig();
const value = quotes.reduce((sum, q, i) => sum + (q.ltp ?? 0n) * BigInt(holdings[i]?.qty ?? 0), 0n);
const previous = quotes.reduce((sum, q, i) => sum + (q.previousClose ?? 0n) * BigInt(holdings[i]?.qty ?? 0), 0n);

export default function Example() {
  return (
    <section className="sc-band" data-theme="dark" aria-labelledby="sc-band-title">
      <div className="sc-band-in">
        <div className="sc-band-copy">
          <StatusPill tone="accent" size="sm">
            New in 2082
          </StatusPill>
          <h3 id="sc-band-title">Your NEPSE portfolio, in your pocket</h3>
          <p className="sc-band-lead">Prices, alerts and every rupee of your holdings, exact to the paisa, on Android and iPhone.</p>
          <CheckList label="What the app does">
            <CheckRow icon={<StateGlyph name="bell" size={18} />} tone="info" title="Price alerts" line="Hear the moment NABIL crosses your level" />
            <CheckRow icon={<StateGlyph name="chart" size={18} />} tone="gain" title="Live portfolio" line="Value, today’s change and P&L as the market moves" />
            <CheckRow icon={<StateGlyph name="lock" size={18} />} tone="neutral" title="Private by default" line="Balances hidden until you choose to show them" />
          </CheckList>
          <div className="sc-band-actions">
            <Button href="#android">Get it for Android</Button>
            <Button href="#iphone" variant="secondary">
              Get it for iPhone
            </Button>
          </div>
        </div>

        <div className="sc-band-phones">
          <figure className="sc-band-phone">
            <div className="sc-band-screen" inert>
              <p className="sc-band-eyebrow">Portfolio</p>
              <p className="sc-band-figure">
                <MoneyDisplay value={value} preset={npr} />
              </p>
              <PriceChange current={value} previous={previous} preset={npr} size="sm" />
              <Sparkline values={nabilCloses} tone="chart" width={220} height={44} />
              <RowList label="Holdings">
                {holdings.slice(0, 3).map((h) => (
                  <ValueRow
                    key={h.symbol}
                    lead={<Tile text={h.symbol} />}
                    symbol={h.symbol}
                    name={h.name}
                    figure={<Figure value={h.ltp * h.qty} kind="rs" />}
                    note={<Delta value={h.change} />}
                  />
                ))}
              </RowList>
            </div>
            <figcaption>The home screen: value, today’s move, holdings.</figcaption>
          </figure>
          <figure className="sc-band-phone is-back">
            <div className="sc-band-screen" inert>
              <div className="sc-band-row">
                <p className="sc-band-eyebrow">Watchlist</p>
                <MarketStatus session={getMarketSession(sampleNow, nepseSchedule)} size="sm" />
              </div>
              <Watchlist quotes={quotes.slice(3, 8)} label="Watchlist" />
            </div>
            <figcaption>The watchlist, with the market session.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
