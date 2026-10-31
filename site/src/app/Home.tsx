import type { ReactNode } from 'react';
import { applyRate } from '@punji/ui/calculations';
import { DebitCredit } from '@punji/ui/debit-credit';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { MoneyDisplay } from '@punji/ui/money-display';
import { MeterBar, ShareBar, SHARE_TONES, type ShareItem } from '@punji/ui/meter';
import { formatBSDate, gregorianToBS } from '@punji/ui/nepal/calendar';
import { PriceChange } from '@punji/ui/price-change';
import { Sparkline } from '@punji/ui/sparkline';
import { SegmentedControl } from '@punji/ui/controls';
import { StatusPill } from '@punji/ui/status-pill';
import { ColumnChart } from '@punji/ui/column-chart';
import { TransactionStatus } from '@punji/ui/transaction-status';
import { useHydrated } from '@punji/ui/use-hydrated';
import { GROUPS, PAGES, type GroupId } from '../registry.ts';
import { pagePath, REPO } from '../seo.ts';
import sizes from '../generated/sizes.json';
import { quotes, sectorShares } from '../sample.ts';
import { Link } from './router.tsx';
import { CopyButton } from './Code.tsx';
import { tokenize } from './highlight.ts';
import { HomeDashboard } from './HomeDashboard.tsx';
import { formatBytes } from './PageView.tsx';
import { ArrowRightIcon, ExternalIcon } from './icons.tsx';

const npr = nepalMoneyConfig();
/** A page's real path from its slug, so a link cannot point at the wrong section. */
const slugPath = (slug: string): string => {
  const page = PAGES.find((p) => p.slug === slug);
  return page ? pagePath(page) : '/';
};
const s = sizes as { modules: Record<string, number>; everything: number | null; styles: number | null; button: number | null };
const INSTALL = 'npm install @punji/ui';

// The preview on each domain card: real components, made inert (not focusable, not announced twice) because the
// whole card is one link. Each is small on purpose; the domain's pages have the full examples.
const quoteRow = (symbol: string) => quotes.find((q) => q.symbol === symbol)!;
const sectorItems: ShareItem[] = sectorShares.map((x, i) => ({ key: x.key, label: x.label, pct: x.pct, tone: SHARE_TONES[i] ?? 'rest' }));

function Snippet({ code }: { code: string }) {
  return (
    <pre className="home-snippet">
      <code>{tokenize(code).map((t, i) => (t.kind === 'plain' ? t.text : <span key={i} className={`tok-${t.kind}`}>{t.text}</span>))}</code>
    </pre>
  );
}

// The hero's right half: the lines the introduction promises, and what they render (live, from the package).
const HERO_CODE = `import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';

const npr = nepalMoneyConfig();

<MoneyDisplay value={123456789n} preset={npr} />
<PriceChange current={48750n} previous={48148n}
  preset={npr} />`;

function HeroDemo() {
  return (
    <div className="home-hero-demo">
      <figure className="home-demo">
        <div className="home-demo-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>Balance.tsx</span>
        </div>
        <Snippet code={HERO_CODE} />
        <figcaption className="home-demo-out">
          <p className="home-demo-label">Renders</p>
          <div className="home-demo-card">
            <small>Portfolio value</small>
            <span className="home-demo-figure">
              <MoneyDisplay value={123456789n} preset={npr} />
            </span>
            <div className="home-demo-row">
              <PriceChange current={48750n} previous={48148n} preset={npr} />
              <small>NABIL today, exact to the paisa</small>
            </div>
          </div>
        </figcaption>
      </figure>
    </div>
  );
}

const DOMAINS: { id: GroupId; flagship: string; blurb: string; featured?: boolean; preview: () => ReactNode }[] = [
  {
    id: 'financial-primitives',
    flagship: 'money-display',
    featured: true,
    blurb: 'Exact amounts, price moves and money inputs in any currency.',
    preview: () => (
      <div className="home-pv-money">
        <MoneyDisplay value={123456789n} preset={npr} />
        <PriceChange current={48750n} previous={48141n} preset={npr} />
      </div>
    ),
  },
  {
    id: 'stock-market',
    flagship: 'stock-table',
    featured: true,
    blurb: 'Quote boards, candlesticks, depth, indices and market status.',
    preview: () => (
      <ul className="home-pv-quotes">
        {['NABIL', 'HDL', 'CHCL'].map((symbol) => {
          const q = quoteRow(symbol);
          return (
            <li key={symbol}>
              <b>{symbol}</b>
              <Sparkline values={q.history} width={64} height={20} label={`${symbol} trend`} />
              <MoneyDisplay value={q.ltp} preset={npr} />
              <PriceChange size="sm" current={q.ltp} previous={q.previousClose} preset={npr} showAbsolute={false} />
            </li>
          );
        })}
      </ul>
    ),
  },
  {
    id: 'portfolio',
    flagship: 'metric-tile',
    blurb: 'Headline figures, allocation, performance and key stats.',
    preview: () => <ShareBar items={sectorItems} label="Banking 46 percent, Hydropower 22, Manufacturing 14, Insurance 10, Telecom 8" legend="list" />,
  },
  {
    id: 'accounting',
    flagship: 'ledger-table',
    blurb: 'Ledgers, journals, trial balances and financial statements.',
    preview: () => (
      <dl className="home-pv-ledger">
        <div>
          <dt>Cash</dt>
          <dd>
            <DebitCredit value={1250000n} />
          </dd>
        </div>
        <div>
          <dt>Sales revenue</dt>
          <dd>
            <DebitCredit value={-1250000n} />
          </dd>
        </div>
        <div className="is-total">
          <dt>Trial balance</dt>
          <dd>
            <StatusPill tone="gain">Balanced</StatusPill>
          </dd>
        </div>
      </dl>
    ),
  },
  {
    id: 'banking',
    flagship: 'transaction-list',
    blurb: 'Accounts, transactions, receipts, payees and payment steps.',
    preview: () => (
      <div className="home-pv-bank">
        <span className="home-pv-label">Savings ·••• 2345</span>
        <MoneyDisplay value={24518075n} preset={npr} />
        <div className="home-pv-row">
          <TransactionStatus status="completed" />
          <TransactionStatus status="pending" />
        </div>
      </div>
    ),
  },
  {
    id: 'data',
    flagship: 'data-table',
    blurb: 'Typed tables, column charts, chart maths and safe CSV export.',
    preview: () => (
      <ColumnChart
        label="Dividends by fiscal year"
        series={[{ key: 'cash', label: 'Cash dividend', tone: 'chart' }]}
        columns={[
          { key: '78', label: '78/79', values: [12] },
          { key: '79', label: '79/80', values: [15] },
          { key: '80', label: '80/81', values: [11] },
          { key: '81', label: '81/82', values: [18] },
        ]}
        height={110}
        legend={false}
        format={(v) => `${v}%`}
      />
    ),
  },
  {
    id: 'forms',
    flagship: 'date-picker',
    blurb: 'Fields, selects, dates in AD and BS, switches and buttons.',
    preview: () => (
      <SegmentedControl label="Chart period" prefix="home-period" size="sm" value="1M" onChange={() => undefined} options={['1D', '1W', '1M', '1Y', '5Y'].map((v) => ({ value: v, label: v }))} />
    ),
  },
  {
    id: 'layout',
    flagship: 'card',
    blurb: 'Cards, tabs, drawers, popovers, pagination and a command palette.',
    preview: () => (
      <div className="home-pv-card">
        <div className="home-pv-card-head">
          <b>Holdings</b>
          <span>12</span>
        </div>
        <div className="home-pv-card-row">
          <span>Invested</span>
          <MoneyDisplay value={98000000n} preset={npr} />
        </div>
        <div className="home-pv-card-row">
          <span>Worth now</span>
          <MoneyDisplay value={124800000n} preset={npr} />
        </div>
      </div>
    ),
  },
  {
    id: 'feedback',
    flagship: 'inline-state',
    blurb: 'Empty, loading, error and locked states, toasts and status pills.',
    preview: () => (
      <div className="home-pv-row is-wrap">
        <StatusPill marker="live">Market open</StatusPill>
        <StatusPill marker="warn">Prices delayed</StatusPill>
        <StatusPill tone="info">Bonus</StatusPill>
      </div>
    ),
  },
  {
    id: 'developer',
    flagship: 'hooks',
    blurb: 'Server-safe hooks for clipboard, storage, pagination and media queries.',
    preview: () => <Snippet code={"const { copy, copied } =\n  useClipboard();\nconst wide = useMediaQuery(\n  '(min-width: 900px)');"} />,
  },
];

function DomainCard({ id, flagship, blurb, featured, preview }: (typeof DOMAINS)[number]) {
  const group = GROUPS.find((g) => g.id === id)!;
  const pages = PAGES.filter((p) => p.group === id);
  const target = PAGES.find((p) => p.slug === flagship) ?? pages[0];
  if (!target) return null;
  return (
    <li className={`home-domain${featured ? ' is-featured' : ''}`}>
      <div className="home-domain-pv" inert>
        {preview()}
      </div>
      <div className="home-domain-text">
        <h3>
          <Link to={pagePath(target)} className="home-domain-link">
            {group.title}
          </Link>
        </h3>
        <p>{blurb}</p>
        <span className="home-domain-count">
          {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          <ArrowRightIcon />
        </span>
      </div>
    </li>
  );
}

// Proof points: each figure is computed here from the package or the build, never typed in.
const commission = applyRate(12345678n, '0.004', 'half-even');
const today = gregorianToBS({ year: 2025, month: 11, day: 14 });

function Proof({ title, children, href, cta }: { title: string; children: ReactNode; href: string; cta: string }) {
  const internal = href.startsWith('/');
  return (
    <li className="home-proof">
      <h3>{title}</h3>
      {children}
      {internal ? (
        <Link to={href} className="home-proof-link">
          {cta} <ArrowRightIcon />
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noopener noreferrer" className="home-proof-link">
          {cta} <ExternalIcon />
          <span className="kit-sr"> (opens in a new tab)</span>
        </a>
      )}
    </li>
  );
}

/**
 * Devanagari money depends on the browser's Intl data for 'ne', which differs between Node (the prerender) and some
 * browsers, so it is formatted after hydration; the prerendered HTML carries the same amount with lakh grouping.
 */
function DevanagariAmount() {
  const hydrated = useHydrated();
  return hydrated ? <strong lang="ne">{formatMoney(123456789n, nepalMoneyConfig({ language: 'ne', digits: 'deva' }))}</strong> : <strong>{formatMoney(123456789n, npr)}</strong>;
}

export function Home() {
  const componentCount = PAGES.filter((p) => p.kind === 'component').length;
  return (
    <div className="home" data-testid="page-home">
      <section className="home-hero" aria-labelledby="page-title">
        <div className="home-hero-grid">
          <div className="home-hero-copy">
        <p className="home-kicker">
          <span className="home-kicker-dot" aria-hidden="true" />
          Pre-release · React components for finance
        </p>
        <h1 tabIndex={-1} id="page-title">
          React components for money, markets and ledgers.
        </h1>
        <p className="home-lead">
          Punji UI gives finance products exact amounts, quote boards, charts, ledgers and payment screens out of the box. Built for Nepal first, with NPR, lakh and crore, Bikram Sambat and NEPSE, and ready for any currency.
        </p>
        <div className="home-actions">
          <Link to="/get-started/using/" className="home-btn is-primary">
            Get started <ArrowRightIcon />
          </Link>
          <a href="#components" className="home-btn">
            Browse components
          </a>
        </div>
        <div className="home-install">
          <code>
            <span className="home-install-prompt" aria-hidden="true">
              $
            </span>{' '}
            {INSTALL}
          </code>
          <CopyButton text={INSTALL} label="the install command" />
        </div>
        <p className="home-install-note">The package goes on npm with the first release. Until then, follow along on GitHub.</p>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section className="home-section" aria-labelledby="built">
        <div className="home-section-head">
          <p className="home-eyebrow">Built with Punji UI</p>
          <h2 id="built">A portfolio screen made only of package components</h2>
          <p>
            Indices, figures, the candlestick chart, allocation, the quote table and the transactions below are all live components rendering the same sample data as the docs.{' '}
            <a href={`${REPO}/blob/main/site/src/app/HomeDashboard.tsx`} target="_blank" rel="noopener noreferrer">
              Read its source<span className="kit-sr"> (opens in a new tab)</span>
            </a>
            .
          </p>
        </div>
        <HomeDashboard />
      </section>

      <section className="home-section" id="components" aria-labelledby="domains">
        <div className="home-section-head">
          <p className="home-eyebrow">{componentCount} components and growing</p>
          <h2 id="domains">Organised by what you are building</h2>
          <p>Every page has live examples, the code that renders them, a props table generated from the published types, and accessibility notes.</p>
        </div>
        <ul className="home-domains">
          {DOMAINS.map((d) => (
            <DomainCard key={d.id} {...d} />
          ))}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="why">
        <div className="home-section-head">
          <p className="home-eyebrow">Why Punji UI</p>
          <h2 id="why">Built for numbers people act on</h2>
        </div>
        <ul className="home-proofs">
          <Proof title="Exact money, explicit rounding" href={slugPath('financial-calculations')} cta="Financial calculations">
            <p>Amounts are bigint minor units, never floating point. Anything that divides asks you how to round.</p>
            <p className="home-proof-figure">
              <span>0.4% commission on {formatMoney(12345678n, npr)}</span>
              <strong>{formatMoney(commission, npr)}</strong>
              <code>applyRate(12345678n, '0.004', 'half-even')</code>
            </p>
          </Proof>
          <Proof title="Nepal first, any currency" href={slugPath('formatters')} cta="Formatters">
            <p>Lakh and crore grouping, Devanagari digits, Bikram Sambat dates and the NEPSE trading calendar are built in. Other currencies are configuration.</p>
            <p className="home-proof-figure">
              <DevanagariAmount />
              <span>{formatBSDate(today)} · {formatMoney(123456n, { currency: 'USD', locale: 'en-US' })}</span>
            </p>
          </Proof>
          <Proof title="Accessible by default" href="/get-started/agents/" cta="The quality bar">
            <p>Direction is never colour alone: every change carries a sign, an arrow and spoken words. Every page of this site is checked with axe at phone and desktop widths in light and dark, and components have visual regression tests.</p>
          </Proof>
          <Proof title="Only pay for what you import" href="/get-started/using/" cta="Imports and styles">
            <p>Each component has its own import path. Sizes are measured by size-limit on every build, gzipped, React excluded.</p>
            {s.modules['money-display'] && s.modules['button'] && (
              <ul className="home-sizes" aria-label="Gzipped sizes">
                <li>
                  <span>Button</span>
                  <MeterBar parts={[{ value: s.modules['button'], tone: 'chart' }]} max={s.modules['stock-table'] ?? 10000} />
                  <b>{formatBytes(s.modules['button'])}</b>
                </li>
                <li>
                  <span>MoneyDisplay</span>
                  <MeterBar parts={[{ value: s.modules['money-display'], tone: 'chart' }]} max={s.modules['stock-table'] ?? 10000} />
                  <b>{formatBytes(s.modules['money-display'])}</b>
                </li>
                {s.modules['stock-table'] && (
                  <li>
                    <span>StockTable</span>
                    <MeterBar parts={[{ value: s.modules['stock-table'], tone: 'chart' }]} max={s.modules['stock-table']} />
                    <b>{formatBytes(s.modules['stock-table'])}</b>
                  </li>
                )}
              </ul>
            )}
          </Proof>
          <Proof title="One runtime dependency" href={`${REPO}/blob/main/DEPENDENCY-AUDIT.md`} cta="Dependency audit">
            <p>React is a peer dependency. The only package installed with Punji UI is a Bikram Sambat date converter, and it only reaches your bundle when you use the BS calendar or date picker.</p>
          </Proof>
          <Proof title="Themed with CSS variables" href="/get-started/theming/" cta="Theming">
            <p>Every colour, size and radius is a CSS variable in cascade layers, so your styles win without !important. Light and dark follow the system or a data-theme attribute on any element.</p>
          </Proof>
        </ul>
      </section>

      <section className="home-cta" aria-labelledby="cta" data-theme="dark">
        <h2 id="cta">Start with one component</h2>
        <p>Show your first exact amount in three lines, then add what you need.</p>
        <div className="home-actions">
          <Link to="/get-started/using/" className="home-btn is-primary">
            Read the introduction <ArrowRightIcon />
          </Link>
          <Link to="/components/money-display/" className="home-btn">
            MoneyDisplay
          </Link>
        </div>
      </section>
    </div>
  );
}
