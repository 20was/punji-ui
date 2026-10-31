import { PortfolioAllocation } from '@punji/ui/portfolio-allocation';
import { Card } from '@punji/ui/card';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <Card title="Loading"><PortfolioAllocation holdings={[]} label="Allocation" state="loading" /></Card>
      <Card title="Nothing to chart"><PortfolioAllocation holdings={[]} label="Allocation" emptyLabel="Buy a share to see your allocation." /></Card>
    </Stack>
  );
}
