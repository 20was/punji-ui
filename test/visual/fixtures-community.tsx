import type { ReactNode } from 'react';
import { CashFlowChart, DataFreshness, FairValueBar, FxRateDisplay, money, NetWorthChart, PriceTargetChart, RangeSelector, ScoreRadar, StatusBanner, WaterfallChart } from '../../src/index.ts';
import { Accordion, Breadcrumb, MenuButton } from '@punji/ui';
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
    </div>
  );
}

const flow = (key: string, i: number, o: number) => ({ key, label: key, inflow: npr(i), outflow: npr(o) });

function CashFlowChartFixture() {
  const p = flow;
  return (
    <div style={{ maxWidth: 560 }}>
      <CashFlowChart label="Cash flow" periods={[p('Shr', 180_000, 120_000), p('Bha', 175_000, 140_000), p('Asw', 210_000, 260_000), p('Kar', 190_000, 150_000), p('Man', 185_000, 135_000)]} />
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
    </div>
  );
}

function RangeSelectorFixture() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 390 }}>
      <RangeSelector value="1M" onChange={() => {}} />
      <RangeSelector value="All" onChange={() => {}} fill />
    </div>
  );
}

function ScoreRadarFixture() {
  const five = [
    { key: 'value', label: 'Value', score: 2, comparison: 3 },
    { key: 'growth', label: 'Future growth', score: 4, comparison: 4 },
    { key: 'past', label: 'Past performance', score: 5, comparison: 3 },
    { key: 'health', label: 'Financial health', score: 6, comparison: 4 },
    { key: 'income', label: 'Dividends', score: 4, comparison: 2 },
  ];
  const eight = ['Future performance outlook', 'Past performance record', 'Financial health and leverage', 'Dividend track record', 'Value against peers', 'Ownership', 'Management quality', 'Liquidity'].map((label, i) => ({ key: `k${i}`, label, score: (i * 5) % 7 }));
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <ScoreRadar label="Company scores" axes={five} labels={{ comparison: 'Sector average' }} defaultSelected="health" />
      <div style={{ maxWidth: 320 }}>
        <ScoreRadar label="Eight long axis names at 320px" axes={eight} />
      </div>
      <ScoreRadar label="Weak total" axes={five.map((a) => ({ ...a, score: 1, comparison: undefined }))} />
    </div>
  );
}

function FairValueBarFixture() {
  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 560 }}>
      <FairValueBar label="Undervalued" price="1284.50" fairValue="1670.00" />
      <FairValueBar label="About fair value" price="990.00" fairValue="1000.00" />
      <FairValueBar label="Overvalued" price={money(231_050n, 'NPR')} fairValue={money(150_000n, 'NPR')} thresholds={{ undervalued: 10, overvalued: 30 }} />
      <FairValueBar label="Far above" price="5200.00" fairValue="1000.00" />
    </div>
  );
}

function PriceTargetChartFixture() {
  const closes = [1010.5, 1032, 1018.25, 1046, 1071.75, 1058, 1089.5, 1102, 1094.25, 1121.5, 1138, 1127.75];
  const history = closes.map((c, i) => ({ date: new Date(Date.UTC(2026, i, 28)).toISOString().slice(0, 10), close: c.toFixed(2) }));
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
      <PriceTargetChart label="Price and analyst targets" history={history} targets={{ date: '2027-11-28', low: '1040.00', average: '1295.50', high: '1480.00' }} />
      <PriceTargetChart label="Targets close together" height={200} history={history} targets={{ date: '2027-05-28', low: '1127.00', average: '1128.50', high: '1130.00' }} />
    </div>
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
  'score-radar': ScoreRadarFixture,
  'fair-value-bar': FairValueBarFixture,
  'price-target-chart': PriceTargetChartFixture,
  // new:component inserts registry entries above this line
};
