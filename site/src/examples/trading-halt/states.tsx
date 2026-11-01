import { Stack } from '@punji/ui/stack';
import { TradingHaltBanner } from '@punji/ui/trading-halt';

export default function Example() {
  return (
    <Stack>
      <TradingHaltBanner kind="circuit-breaker" changePercent={-4.12} resumesAt="13:25" />
      <TradingHaltBanner kind="circuit-breaker" changePercent={6.05} />
      <TradingHaltBanner kind="halt" detail="Notice: system maintenance. Open orders stay in the book." onDismiss={() => undefined} />
      <TradingHaltBanner kind="resumed" />
    </Stack>
  );
}
