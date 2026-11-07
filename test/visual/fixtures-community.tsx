import type { ReactNode } from 'react';
import { DataFreshness, FxRateDisplay, StatusBanner } from '../../src/index.ts';
import { Accordion, Breadcrumb, MenuButton } from '@punji/ui';
import { AlertListEmpty, AlertRow, AlertRowCompact, AlertRowList, AlertRowSkeleton, AlertSummary, AlertSummaryNote, AlertSummarySection, BarList, BrokerBadge, HeadlineList, InstrumentHeader, MonthStrip, RatingChangeList, RatingChangeRow, RatingChip, RatingScale } from '@punji/ui';
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

function InstrumentHeaderFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <InstrumentHeader symbol="NABIL" name="Nabil Bank Limited" group="Commercial Banks" glyph={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16V8l7-4 7 4v8M7 16v-5h6v5" /></svg>} currency="NPR" price={51230n} previousClose={50800n} actions={<button type="button">Watch</button>} />
      <InstrumentHeader symbol="NEPSE" tag="Index" name="Nepal Stock Exchange index" figure="2,641.18" figureChange={{ text: '−12.40 · −0.47%', direction: 'down' }} />
      <InstrumentHeader symbol="HIDCL" name="Hydroelectricity Investment and Development Company Limited" currency="NPR" price={31890n} previousClose={31890n} note="Last close · 16 Oct" />
      <InstrumentHeader symbol="NICA" currency="NPR" price={null} loading />
    </div>
  );
}

function BrokerBadgeFixture() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {([36, 40, 48, 56] as const).map((size) => <BrokerBadge key={size} code={58} size={size} />)}
      <BrokerBadge code={7} tone="inverse" />
      <BrokerBadge code={58} tone="accent" size={56} />
      <BrokerBadge code={58} size={132} caption="Broker" />
    </div>
  );
}

function HeadlineListFixture() {
  return (
    <div style={{ width: '100%', maxWidth: 390 }}>
      <HeadlineList label="Latest headlines" items={[
        { key: 'a', title: 'NABIL proposes a 12% cash dividend for the fiscal year and a book closure on 18 Oct, subject to the AGM', line: 'Company filing · 2 days ago', href: 'https://example.com/nabil' },
        { key: 'b', title: 'Board meeting on Sunday', line: 'NEPSE · 3 days ago' },
      ]} />
    </div>
  );
}

function RatingScaleFixture() {
  const steps = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {steps.map((s, i) => <RatingChip key={s} step={i}>{s}</RatingChip>)}
        <RatingChip step={null}>Not rated</RatingChip>
      </div>
      <RatingScale value={3} from={1} label="Agree, up from Disagree" />
      <RatingScale legend={['Low', 'Medium', 'High']} size="lg" label="Risk" />
      <RatingChangeList title="Moved up" icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>} tone="gain" count={2}>
        <RatingChangeRow icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>} title="NABIL" line="Nabil Bank Limited" from={{ step: 2, label: 'Neutral' }} to={{ step: 3, label: 'Mildly bullish' }} figure="512.30" figureSub="Getting stronger" moveLabel="Neutral to Mildly bullish" />
        <RatingChangeRow icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>} title="NICA" line="NIC Asia Bank" from={{ step: null, label: 'Not rated' }} to={{ step: 4, label: 'Bullish' }} figure="348.10" />
      </RatingChangeList>
      <RatingChangeList label="Held" variant="held"><RatingChangeRow variant="held" title="SBI" line="Nepal SBI Bank" to={{ step: 2, label: 'Neutral' }} /></RatingChangeList>
    </div>
  );
}

const monthCell = (key: string, label: string, text: string, tone: 'gain' | 'loss' | 'flat') => ({ key, label, text, tone, aria: `${label} 2026: ${text}` });

function MonthStripFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <MonthStrip label="Months" head="3 of 4 months rose" foot="Best Jun, worst Jul" cells={[monthCell('1', 'Jun', '+1.64%', 'gain'), monthCell('2', 'Jul', '−0.80%', 'loss'), monthCell('3', 'Aug', '0.00%', 'flat'), monthCell('4', 'Sep', '+2.10%', 'gain')]} />
    </div>
  );
}

function BarListFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <BarList label="Sectors" empty="No sectors" heading="By sector" items={[
        { id: 'a', label: 'Commercial Banks', value: 94_100_000_00n, valueText: 'Rs 9.41 crore' },
        { id: 'b', label: 'Hydropower', value: 31_200_000_00n, valueText: 'Rs 3.12 crore' },
        { id: 'c', label: 'Hotels and Tourism', value: null, valueText: 'No data' },
      ]} />
      <BarList label="Empty" empty="Nothing here yet" items={[]} />
      <BarList label="Loading" empty="" items={[]} loading />
    </div>
  );
}

function AlertRowFixture() {
  const row = { symbol: 'HRL', name: 'Himalayan Reinsurance', mark: 'above' as const, condition: 'Above Rs 500', repeat: 'Once', price: 'Rs 493.80', distance: '1.26% to go', onOpen: () => {} };
  return (
    <div style={{ display: 'grid', gap: 24, width: '100%', maxWidth: 390 }}>
      <AlertRowList label="Alerts">
        <AlertRow {...row} status="waiting" closeness={0.87} />
        <AlertRow {...row} symbol="NABIL" status="crossed" distance="Past the target · fires on the next check" closeness={1} />
        <AlertRow {...row} symbol="NICA" mark="below" status="fired" distance="Reached Fri 16 Oct, 13:42" closeness={null} />
        <AlertRow {...row} symbol="SBI" status="paused" closeness={0.4} />
        <AlertRowSkeleton />
      </AlertRowList>
      <div>
        <AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" closeness={0.87} href="/a" />
        <AlertRowCompact title={<><b>NABIL</b> below Rs 480</>} aside="Reached" status="fired" sub="Now 478.00 · Fri 16 Oct, 13:42" />
      </div>
      <AlertListEmpty title="No alerts yet" body="Set a price alert from a stock page." />
    </div>
  );
}

function AlertSummaryFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <AlertSummary label="Price alerts" value="4 active" sub="1 paused · 1 triggered">
        <AlertSummarySection title="Closest to firing">
          <AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" closeness={0.87} />
        </AlertSummarySection>
        <AlertSummarySection title="Fired lately"><AlertSummaryNote>Fills in when prices load</AlertSummaryNote></AlertSummarySection>
      </AlertSummary>
      <AlertSummary label="Price alerts" value="" loading />
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
  'instrument-header': InstrumentHeaderFixture,
  'broker-badge': BrokerBadgeFixture,
  'headline-list': HeadlineListFixture,
  'rating-scale': RatingScaleFixture,
  'month-strip': MonthStripFixture,
  'bar-list': BarListFixture,
  'alert-row': AlertRowFixture,
  'alert-summary': AlertSummaryFixture,
  // new:component inserts registry entries above this line
};
