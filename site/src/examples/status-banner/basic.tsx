import { StatusBanner } from '@punji/ui/status-banner';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <StatusBanner title="Markets are closed." action={{ label: 'Trading hours', href: 'https://example.com/trading-hours' }}>
        Orders you place now queue for the next session.
      </StatusBanner>
      <StatusBanner tone="warn" title="Prices are delayed by 15 minutes." dismissible>
        Do not rely on them for time-sensitive decisions.
      </StatusBanner>
      <StatusBanner tone="danger" title="Payments are degraded." action={{ label: 'View status', href: 'https://status.example.com' }}>
        Transfers may fail or arrive late.
      </StatusBanner>
    </Stack>
  );
}
