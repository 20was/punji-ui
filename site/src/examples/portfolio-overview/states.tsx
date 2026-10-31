import { PortfolioOverview } from '@punji/ui/portfolio-overview';
import { Card } from '@punji/ui/card';

export default function Example() {
  return (
    <div className="ex-stack">
      <Card><PortfolioOverview state="loading" /></Card>
      <PortfolioOverview state="error" onRetry={() => undefined} />
    </div>
  );
}
