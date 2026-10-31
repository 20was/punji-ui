import { PortfolioOverview } from '@punji/ui/portfolio-overview';
import { Card } from '@punji/ui/card';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <Card><PortfolioOverview state="loading" /></Card>
      <PortfolioOverview state="error" onRetry={() => undefined} />
    </Stack>
  );
}
