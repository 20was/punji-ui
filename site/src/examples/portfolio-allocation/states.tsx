import { PortfolioAllocation } from '@punji/ui/portfolio-allocation';
import { Card } from '@punji/ui/card';

export default function Example() {
  return (
    <div className="ex-stack">
      <Card title="Loading"><PortfolioAllocation holdings={[]} label="Allocation" state="loading" /></Card>
      <Card title="Nothing to chart"><PortfolioAllocation holdings={[]} label="Allocation" emptyLabel="Buy a share to see your allocation." /></Card>
    </div>
  );
}
