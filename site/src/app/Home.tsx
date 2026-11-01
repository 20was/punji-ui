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
import type { GroupId } from '../registry.ts';
import home from '../generated/home.json';
import { GROUPS, NAV as PAGES, type PageCard } from './nav.ts';
import { NPM_URL, pagePath, REPO } from '../paths.ts';
import sizes from '../generated/sizes.json';
import { quotes, sectorShares } from '../sample.ts';
import { Link } from './router.tsx';
import { CopyButton } from './Code.tsx';
import { tokenize } from './highlight.ts';
import { HomeDashboard } from './HomeDashboard.tsx';
import { formatBytes } from './format.ts';
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
    blurb: 'Quote boards, candlesticks, depth, indices, market status, order tickets and trading halts.',
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
    blurb: 'Ledgers, journals, trial balances, financial statements, tax, invoices and payroll.',
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
    blurb: 'Accounts, transactions, receipts, payees, loans, KYC and wallet payments.',
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
    id: 'share-issues',
    flagship: 'issue-card',
    blurb: 'IPO and right-share issues, applications, allotment results, demat accounts and corporate actions.',
    preview: () => (
      <div className="home-pv-bank">
        <span className="home-pv-label">IPO · open</span>
        <div className="home-pv-row">
          <StatusPill tone="info">Apply by 15 Poush</StatusPill>
          <StatusPill tone="gain">Allotted</StatusPill>
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
    <li className={`home-domain${featured ? ' is-featured' : ''}`} id={`domain-${id}`}>
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

// Who it is for: each audience links to the pages that serve it (descriptive anchors, no orphan pages).
const AUDIENCE: readonly (readonly [string, string, readonly (readonly [string, string])[]])[] = [
  ['Stock market and trading apps', 'Quote boards, movers, indices, watchlists, price limits and order book depth, with exact prices and accessible direction.', [['stock-table', 'NEPSE stock table'], ['candlestick-chart', 'Candlestick chart'], ['market-board', 'Live market board']]],
  ['Portfolio and wealth trackers', 'Holdings with cost basis and P&L, allocation, dividends and performance against a benchmark.', [['holdings-table', 'Holdings table'], ['financial-calculations', 'Position maths'], ['portfolio-tracker', 'Portfolio tracker']]],
  ['Accounting and bookkeeping', 'Ledgers with running balances, journal entries, trial balances, statements and payment status.', [['ledger-table', 'Accounting ledger'], ['trial-balance', 'Trial balance'], ['accounting-dashboard', 'Accounting dashboard']]],
  ['Banking, payments and fintech', 'Money input that never rounds, masked account numbers, transactions, receipts and payment timelines.', [['currency-input', 'Currency input'], ['transaction-list', 'Transaction list'], ['payment-flow', 'Payment flow']]],
  ['Apps for Nepal', 'NPR with lakh and crore grouping, Devanagari digits, Bikram Sambat dates, the Nepal fiscal year and NEPSE market hours.', [['formatters', 'Lakh and crore formatting'], ['date-picker', 'Nepali date picker'], ['market-status', 'NEPSE market status']]],
];

// Facts about this package only; the left column describes what a kit without finance types has to leave to the app.
const COMPARE: readonly (readonly [string, string, string])[] = [
  ['Amounts', 'A JavaScript number, so 0.1 + 0.2 drifts', 'bigint minor units end to end; division asks how to round'],
  ['Number grouping', 'Whatever the locale gives you', 'Lakh and crore (12,34,567) or Western grouping, Devanagari or Latin digits'],
  ['Dates', 'Gregorian only; a Nepali calendar is another library', 'Gregorian and Bikram Sambat in one date picker, date-only ISO values'],
  ['Gain and loss', 'Often colour alone', 'A sign, an arrow and spoken words as well as colour'],
  ['Finance screens', 'Generic tables and cards to assemble', 'Quote boards, ledgers, trial balances, statements and receipts ready to use'],
];

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
          v{PKG_VERSION} on npm · MIT · React 19
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
        <p className="home-install-note">
          Published on{' '}
          <a href={NPM_URL} target="_blank" rel="noopener noreferrer">
            npm<span className="kit-sr"> (opens in a new tab)</span>
          </a>{' '}
          with provenance. React 19 and React DOM 19 are peer dependencies; TypeScript types are included.
        </p>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section className="home-section" aria-labelledby="for-h">
        <div className="home-section-head">
          <p className="home-eyebrow">Who it is for</p>
          <h2 id="for-h">For teams building screens where a wrong digit costs money</h2>
          <p>Punji UI is a React component library for financial products. It starts from Nepal (NPR, lakh and crore, Devanagari digits, the Bikram Sambat calendar, NEPSE) and works in any currency and locale.</p>
        </div>
        <ul className="home-audience">
          {AUDIENCE.map(([title, text, links]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
              <p className="home-audience-links">
                {links.map(([slug, label], i) => (
                  <span key={slug}>
                    {i > 0 && ' · '}
                    <Link to={slugPath(slug)}>{label}</Link>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
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

      <section className="home-section" id="apps" aria-labelledby="apps-h">
        <div className="home-section-head">
          <p className="home-eyebrow">Apps</p>
          <h2 id="apps-h">Complete dashboards, live</h2>
          <p>
            Full-screen, multi-screen apps on a simulated market: state, live prices, keyboard shortcuts, empty, loading and error states. Built only from
            package components, with their source.
          </p>
        </div>
        <ul className="home-showcase">
          {(home.apps as PageCard[]).map((p) => (
            <li key={p.slug}>
              <Link to={pagePath(p)}>
                <strong>{p.navTitle ?? p.title}</strong>
                <span>{p.lead}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section" id="showcase" aria-labelledby="showcase-h">
        <div className="home-section-head">
          <p className="home-eyebrow">Showcase</p>
          <h2 id="showcase-h">Real screens to copy</h2>
          <p>
            Product screens built only from package components and a small layout stylesheet each, live, with their source. They are patterns to copy, not
            package API.
          </p>
        </div>
        <ul className="home-showcase">
          {(home.showcase as PageCard[]).map((p) => (
            <li key={p.slug}>
              <Link to={pagePath(p)}>
                <strong>{p.title}</strong>
                <span>{p.lead}</span>
              </Link>
            </li>
          ))}
        </ul>
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
        <div className="home-compare">
          <h3 id="compare">What a general-purpose kit leaves to you</h3>
          <div className="doc-table-wrap">
            <table className="doc-table">
              <caption className="kit-sr">How Punji UI handles finance details that general-purpose React UI kits leave to the app</caption>
              <thead>
                <tr>
                  <th scope="col">Detail</th>
                  <th scope="col">General-purpose kit</th>
                  <th scope="col">Punji UI</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([detail, generic, punji]) => (
                  <tr key={detail}>
                    <th scope="row">{detail}</th>
                    <td>{generic}</td>
                    <td>{punji}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
