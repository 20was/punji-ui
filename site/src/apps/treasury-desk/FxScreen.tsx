import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { FxRateDisplay } from '@punji/ui/fx-rate';
import { MeterBar } from '@punji/ui/meter';
import { Select } from '@punji/ui/select';
import { StatusBanner } from '@punji/ui/status-banner';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount } from '../shared/moneyCells.tsx';
import { MID_RATE, POLICY, SHOCKS, nprText, rateOf, shockLabel, shockedRate, toNpr, usdText } from './treasury.ts';
import { useTreasury } from './store.ts';

interface Row {
  id: string;
  label: string;
  note: string;
  usd: bigint;
}
interface Shock {
  bps: number;
  rate: string;
  npr: bigint;
  change: bigint;
}

/** Dollar exposure: the account, the invoices to come in and the licences to go out, netted; what the position is
 *  worth in rupees at each rate move; and the rate that applies to the whole app. */
export default function FxScreen() {
  const { state, derived, dispatch } = useTreasury();
  const ex = derived.exposure;
  const rows: Row[] = [
    { id: 'cash', label: 'Dollar account', note: 'Standard Chartered, today', usd: ex.cash },
    { id: 'in', label: 'Dollar receipts', note: 'Invoices due in 13 weeks', usd: ex.receipts },
    { id: 'out', label: 'Dollar payments', note: 'Licences due in 13 weeks', usd: -ex.payments },
  ];
  const base = toNpr(ex.net, shockedRate(0));
  const shocks: Shock[] = SHOCKS.map((bps) => {
    const rate = shockedRate(bps);
    const npr = toNpr(ex.net, rate);
    return { bps, rate, npr, change: npr - base };
  });
  const columns: FinancialColumn<Row>[] = [
    {
      key: 'line',
      label: 'Position',
      rowHeader: true,
      render: (r) => (
        <span className="td-desc">
          <strong>{r.label}</strong>
          <span>{r.note}</span>
        </span>
      ),
    },
    { key: 'usd', label: 'USD', kind: 'money', num: true, render: (r) => `${r.usd < 0n ? '-' : ''}${usdText(r.usd < 0n ? -r.usd : r.usd)}` },
    { key: 'npr', label: 'In NPR', kind: 'money', num: true, render: (r) => <Amount value={toNpr(r.usd, ex.rate)} /> },
  ];
  const sensitivityColumns: FinancialColumn<Shock>[] = [
    { key: 'move', label: 'Dollar rate', rowHeader: true, render: (s) => <strong>{shockLabel(s.bps)}</strong> },
    { key: 'rate', label: 'NPR per USD', num: true, render: (s) => s.rate },
    { key: 'npr', label: 'Position in NPR', kind: 'money', num: true, render: (s) => <Amount value={s.npr} plain /> },
    { key: 'change', label: 'Change', kind: 'money', num: true, render: (s) => <Amount value={s.change} /> },
    { key: 'limit', label: 'Against the limit', render: (s) => (s.npr > POLICY.fxLimit ? `! Over by ${nprText(s.npr - POLICY.fxLimit)}` : `✓ ${nprText(POLICY.fxLimit - s.npr)} inside`) },
  ];
  return (
    <div className="app-stack">
      <ScreenTitle>Dollar exposure</ScreenTitle>
      <div className="app-grid is-halves">
        <Card title="Rate" description="Mid-market, as quoted on the session date." headingLevel={3}>
          <FxRateDisplay rate={rateOf(MID_RATE)} inverse locale="en-IN" timeZone="Asia/Kathmandu" testId="td-fx-rate" />
        </Card>
        <Card title="Scenario" description="Move the dollar rate for the whole desk: the position, the buffer and the forecast follow." headingLevel={3}>
          <Select label="Dollar rate moves" labelPlacement="above" value={String(state.fxBps)} onChange={(v) => dispatch({ type: 'shock', bps: Number(v) })} options={SHOCKS.map((bps) => ({ value: String(bps), label: shockLabel(bps) }))} testId="td-shock" />
          <p className="app-muted app-small">At this scenario USD 1 is NPR {ex.rate}.</p>
        </Card>
      </div>
      {ex.netNpr > POLICY.fxLimit ? (
        <StatusBanner tone="warn" title="Over the exposure limit" testId="td-fx-limit">
          The open dollar position is {nprText(ex.netNpr)}, {nprText(ex.netNpr - POLICY.fxLimit)} over the limit of {nprText(POLICY.fxLimit)}. Convert dollars or hedge the receipts.
        </StatusBanner>
      ) : (
        <StatusBanner tone="info" title="Inside the exposure limit" testId="td-fx-limit">
          The open dollar position is {nprText(ex.netNpr)} against a limit of {nprText(POLICY.fxLimit)}.
        </StatusBanner>
      )}
      <Card title="Open position" description="What the company owns or will receive in dollars, less what it will pay." headingLevel={3} flush testId="td-fx-position">
        <FinancialTable caption="Dollar position (USD and NPR)" columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No dollar position" />
        <p className="td-fx-net" data-testid="td-fx-net">
          Net open position <strong>{usdText(ex.net)}</strong> = <strong>{nprText(ex.netNpr)}</strong>
        </p>
        <div className="td-fx-meter">
          <MeterBar parts={[{ value: Number(ex.netNpr), tone: ex.netNpr > POLICY.fxLimit ? 'loss' : 'chart' }]} max={Number(POLICY.fxLimit * 3n / 2n)} marker={Number(POLICY.fxLimit)} label={`Open position ${nprText(ex.netNpr)} against the limit of ${nprText(POLICY.fxLimit)}`} />
        </div>
      </Card>
      <Card title="If the rate moves" description="The same dollars worth more or less in rupees. Exact: each row is converted once, rounded half-even." headingLevel={3} flush testId="td-fx-sensitivity">
        <FinancialTable caption="Net dollar position in NPR at each rate move" columns={sensitivityColumns} rows={shocks} rowKey={(s) => String(s.bps)} emptyTitle="No scenarios" />
      </Card>
    </div>
  );
}
