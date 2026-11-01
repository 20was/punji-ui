import { Card } from '@punji/ui/card';
import { formatMoney, nepalMoneyPreset } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';
import { adjustedPrice, costBasisSteps } from '@punji/ui/share-issues';
import { costHistory } from '../../sample.ts';

const rs = (paisa: bigint | null) => (paisa === null ? '—' : formatMoney(paisa, nepalMoneyPreset));
const KIND = { buy: 'Bought', sell: 'Sold', bonus: 'Bonus 10%', right: 'Right 1:2 at Rs 100' } as const;

// Exact to the paisa: one rounding at the end, with the mode you choose.
export default function Example() {
  const steps = costBasisSteps({ quantity: 0n, cost: 0n }, costHistory);
  return (
    <div className="ex-grid">
      <Card title="Price after book close" description="Rs 500 before the book close" headingLevel={3}>
        <DataRows label="Adjusted prices">
          <DataRow label="10% bonus" value={rs(adjustedPrice({ price: 50_000n, bonus: '10' }))} />
          <DataRow label="50% right at Rs 100" value={rs(adjustedPrice({ price: 50_000n, right: '50' }))} />
          <DataRow label="Both together" value={rs(adjustedPrice({ price: 50_000n, bonus: '10', right: '50' }))} />
        </DataRows>
      </Card>
      <Card title="WACC through each step" description="Average cost, bonus units at zero cost" headingLevel={3}>
        <DataRows label="Cost basis steps">
          {steps.map((s, i) => (
            <DataRow key={i} label={`${KIND[s.action.kind]}: ${s.quantity.toString()} units`} value={`WACC ${rs(s.wacc)}`} />
          ))}
        </DataRows>
      </Card>
    </div>
  );
}
