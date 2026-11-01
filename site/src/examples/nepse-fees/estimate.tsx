import { Stack } from '@punji/ui/stack';
import { DataRow, DataRows } from '@punji/ui/rows';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { estimateNepseTrade, type NepseTradeEstimate } from '@punji/ui/nepse-fees';

const npr = nepalMoneyConfig();

// 100 NABIL bought at Rs 512.30, then sold at Rs 600.00 after 100 days. Prices are paisa.
const buy = estimateNepseTrade({ side: 'buy', quantity: 100n, price: 51_230n });
const sell = estimateNepseTrade({ side: 'sell', quantity: 100n, price: 60_000n, costBasis: buy.total, holdingDays: 100 });

// '0.0033' → '0.33%' without a float: move the point two places.
function percent(rate: string): string {
  const [whole = '0', fraction = ''] = rate.split('.');
  const digits = whole + fraction.padEnd(2, '0');
  const integer = digits.slice(0, whole.length + 2).replace(/^0+(?=\d)/, '');
  const rest = digits.slice(whole.length + 2).replace(/0+$/, '');
  return `${integer}${rest ? `.${rest}` : ''}%`;
}

const m = (value: bigint) => <MoneyDisplay value={value} preset={npr} />;

function Lines({ label, estimate }: { label: string; estimate: NepseTradeEstimate }) {
  return (
    <DataRows label={label}>
      <DataRow label="Amount" value={m(estimate.amount)} />
      <DataRow label={`Broker commission (${estimate.commissionRate ? percent(estimate.commissionRate) : 'marginal'})`} value={m(estimate.commission)} />
      <DataRow label="SEBON fee" value={m(estimate.sebonFee)} />
      <DataRow label="DP charge" value={m(estimate.dpCharge)} />
      {estimate.capitalGain !== null && <DataRow label="Capital gain" value={m(estimate.capitalGain)} />}
      {estimate.capitalGainsTaxRate && <DataRow label={`Capital gains tax (${percent(estimate.capitalGainsTaxRate)})`} value={m(estimate.capitalGainsTax)} />}
      <DataRow label={estimate.side === 'buy' ? 'Total payable' : 'Total receivable'} value={m(estimate.total)} />
    </DataRows>
  );
}

export default function Example() {
  return (
    <Stack className="ex-narrow">
      <Lines label="Buy 100 NABIL at 512.30" estimate={buy} />
      <Lines label="Sell 100 NABIL at 600.00" estimate={sell} />
    </Stack>
  );
}
