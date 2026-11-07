import type { ReactNode } from 'react';
import { CashFlowChart, DataFreshness, FxRateDisplay, money, NetWorthChart, RangeSelector, StatusBanner, WaterfallChart } from '../../src/index.ts';
import { Accordion, Breadcrumb, MenuButton } from '@punji/ui';
import { Card, CardSection, CardSectionRow, Figure, LinkRow, LinkRowList, MoneyDisplay, PrivateAmount, SettingList, SettingRow, SkipLink, StatusTag, ThemeProvider } from '@punji/ui';
import { RouteAnnouncer } from '@punji/ui';
// new:component inserts imports above this line

// Visual fixtures for components scaffolded with `npm run new:component <name>` (docs/CONTRIBUTING-COMPONENT.md).
// Each starts `pending` in manifest.ts (axe runs, no screenshot) until its Docker baseline is recorded.
// The generator inserts code above the marker lines, keep them.

const T = '2026-11-07T04:00:00Z';
const rate = { base: 'USD', quote: 'NPR', rate: '133.40', asOf: T, source: 'Nepal Rastra Bank' } as const;
const fixed = () => Date.parse('2026-11-07T04:12:00Z');

function FxRateFixture() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <FxRateDisplay rate={rate} timeZone="UTC" now={fixed()} />
      <FxRateDisplay buy={{ ...rate, rate: '133.10' }} sell={{ ...rate, rate: '133.70' }} timeZone="UTC" />
      <FxRateDisplay rate={rate} inverse timeZone="UTC" hideSource />
      <FxRateDisplay rate={rate} locale="ne-NP-u-nu-deva" timeZone="UTC" />
    </div>
  );
}

// Menu is a portal that opens on interaction: the fixture shows its buttons (text and icon-only); the open state is covered by the unit tests.
function MenuFixture() {
  const items = [{ id: "a", label: "View", onSelect: () => {} }];
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <MenuButton label="Account" items={items} />
      <MenuButton iconOnly label="Actions for NABIL" items={items} />
      <MenuButton label="Disabled" items={items} disabled />
    </div>
  );
}

function DataFreshnessFixture() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <DataFreshness state="live" asOf={T} now={fixed} />
      <DataFreshness state="delayed" delayMinutes={15} asOf={T} now={fixed} />
      <DataFreshness state="end-of-day" asOf={T} now={fixed} />
      <DataFreshness state="stale" asOf={T} now={fixed} />
      <DataFreshness state="offline" asOf={T} now={fixed} />
    </div>
  );
}

function BreadcrumbFixture() {
  const trail = [{ label: "Accounts", href: "/accounts" }, { label: "Savings", href: "/accounts/savings" }, { label: "Joint", href: "/accounts/savings/joint" }, { label: "Kartik 2082" }];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Breadcrumb items={trail} labels={{ nav: "Fixture path" }} />
      <Breadcrumb items={trail} maxItems={3} labels={{ nav: "Fixture collapsed path" }} />
    </div>
  );
}

function StatusBannerFixture() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <StatusBanner title="Markets are closed." action={{ label: 'Trading hours', href: '/hours' }}>Orders queue for the next session.</StatusBanner>
      <StatusBanner tone="warn" title="Prices are delayed." dismissible>Do not rely on them for time-sensitive decisions.</StatusBanner>
      <StatusBanner tone="danger" title="Payments are degraded." action={{ label: 'View status', onClick: () => undefined }}>Transfers may fail or arrive late, and this longer sentence checks that the message wraps beside the action on a narrow screen.</StatusBanner>
    </div>
  );
}

function AccordionFixture() {
  const items = [
    { id: "fees", header: "Fees", children: <p>No monthly fee.</p> },
    { id: "limits", header: "Limits", children: <p>NPR 500,000 a day.</p> },
    { id: "closing", header: "Closing", disabled: true, children: <p>Visit a branch.</p> },
  ];
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <Accordion items={items} defaultValue={["fees"]} />
      <Accordion items={items} type="multiple" defaultValue={["fees", "limits"]} />
    </div>
  );
}

const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');

function WaterfallChartFixture() {
  return (
    <div style={{ maxWidth: 560 }}>
      <WaterfallChart
        label="Profit bridge"
        steps={[
          { key: 'open', label: 'Opening', amount: npr(500_000), total: true },
          { key: 'sales', label: 'Sales', amount: npr(1_200_000) },
          { key: 'cogs', label: 'Cost of sales', amount: npr(-700_000) },
          { key: 'tax', label: 'Tax', amount: npr(-90_000) },
          { key: 'close', label: 'Closing', amount: npr(0), total: true },
        ]}
      />
// ThemeProvider and RouteAnnouncer draw nothing: the fixtures show the region the theme is applied to, and the (hidden) live region beside it.
function ThemeProviderFixture() {
  return (
    <ThemeProvider storageKey="fixture-theme" defaultTheme="light" target={() => document.getElementById('theme-fixture-region')}>
      <div id="theme-fixture-region" style={{ padding: 16, borderRadius: 12, background: 'var(--pu-color-bg)', color: 'var(--pu-color-text)' }}>Region themed by ThemeProvider</div>
    </ThemeProvider>
  );
}

function PrivateAmountFixture() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>Shown: <MoneyDisplay currency="NPR" value={124835000n} /> <Figure value={1250} kind="int" /></div>
      <div>Masked: <MoneyDisplay currency="NPR" value={124835000n} masked /> <Figure value={1250} kind="int" masked /></div>
      <div>Wrapper in a headline: <b style={{ fontSize: 28 }}><PrivateAmount>Rs 12,48,350.00</PrivateAmount></b></div>
    </div>
  );
}

const flow = (key: string, i: number, o: number) => ({ key, label: key, inflow: npr(i), outflow: npr(o) });

function CashFlowChartFixture() {
  const p = flow;
  return (
    <div style={{ maxWidth: 560 }}>
      <CashFlowChart label="Cash flow" periods={[p('Shr', 180_000, 120_000), p('Bha', 175_000, 140_000), p('Asw', 210_000, 260_000), p('Kar', 190_000, 150_000), p('Man', 185_000, 135_000)]} />
function SkipLinkFixture() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <SkipLink href="#fixture-main" />
      <p>The link is off screen until it takes focus. This fixture focuses it.</p>
      <main id="fixture-main">Main content</main>
    </div>
  );
}

function NetWorthChartFixture() {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const a = [900, 940, 980, 1010, 1060, 1100];
  const l = [300, 290, 280, 1050, 1030, 1010];
  return (
    <div style={{ maxWidth: 560 }}>
      <NetWorthChart label="Net worth" points={m.map((k, i) => ({ key: k, label: k, assets: npr(a[i]! * 1000), liabilities: npr(l[i]! * 1000) }))} />
function RouteAnnouncerFixture() {
  return (
    <div>
      <RouteAnnouncer routeKey="/markets" />
      <p>The live region is visually hidden; it announces the page title after a route change.</p>
    </div>
  );
}

function RangeSelectorFixture() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 390 }}>
      <RangeSelector value="1M" onChange={() => {}} />
      <RangeSelector value="All" onChange={() => {}} fill />
    </div>
function CardSectionFixture() {
  return (
    <Card flush label="Sections">
      <CardSection title="Holdings" note="as of close" titleId="fx-cs-h" aside={<StatusTag>NPR</StatusTag>}>
        <p style={{ margin: 0 }}>Nabil Bank, Nepal Telecom and Himalayan Bank make up 62% of the portfolio.</p>
      </CardSection>
      <CardSectionRow>
        <CardSection title="Bought" headingLevel={3}><MoneyDisplay currency="NPR" value={18450000n} /></CardSection>
        <CardSection title="Sold" headingLevel={3}><MoneyDisplay currency="NPR" value={7120000n} /></CardSection>
      </CardSectionRow>
      <CardSection foot><p>Source: broker statements. Nothing here is advice.</p></CardSection>
    </Card>
  );
}

function SettingRowFixture() {
  return (
    <Card label="Settings">
      <SettingList>
        <SettingRow title="Daily summary" line="On · one summary after the close" toggle={{ checked: true, onChange: () => {} }} />
        <SettingRow title="Profile" line="A very long line of words that wraps onto a second row on a narrow screen without cutting" href="/me" />
        <SettingRow title="Terms" href="https://example.com/terms" newTab />
        <SettingRow danger title="Delete account" line="This cannot be undone" onClick={() => {}} />
      </SettingList>
    </Card>
  );
}

function LinkRowFixture() {
  return (
    <Card title="Watchlist" flush>
      <LinkRowList label="Watchlist">
        <LinkRow href="/stocks/NABIL" symbol="NABIL" name="Nabil Bank Limited with a very long name that truncates before the symbol" pill={<StatusTag>Banks</StatusTag>} line="Rs 1,250.00 · +1.20% today" value="Rs 1,250" caption="Today" />
        <LinkRow href="/stocks/HBL" symbol="HBL" name="Himalayan Bank" line="Held: 0 units" value="No cash" tone="neutral" />
        <LinkRow href="/stocks/SHL" symbol="SHL" dense line="Down from your cost" value="-56.82%" tone="warn" />
      </LinkRowList>
    </Card>
  );
}

// new:component inserts fixtures above this line

export const communityRegistry: Record<string, () => ReactNode> = {
  'fx-rate': FxRateFixture,
  'data-freshness': DataFreshnessFixture,
  'status-banner': StatusBannerFixture,
  'menu': MenuFixture,
  'breadcrumb': BreadcrumbFixture,
  'accordion': AccordionFixture,
  'waterfall-chart': WaterfallChartFixture,
  'cash-flow-chart': CashFlowChartFixture,
  'net-worth-chart': NetWorthChartFixture,
  'range-selector': RangeSelectorFixture,
  'theme-provider': ThemeProviderFixture,
  'private-amount': PrivateAmountFixture,
  'skip-link': SkipLinkFixture,
  'route-announcer': RouteAnnouncerFixture,
  'card-section': CardSectionFixture,
  'setting-row': SettingRowFixture,
  'link-row': LinkRowFixture,
  // new:component inserts registry entries above this line
};
