import { DividendHistory } from '@punji/ui/dividend-history';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <DividendHistory entries={[]} caption="Dividends, loading" state="loading" />
      <DividendHistory entries={[]} caption="Dividends, empty" emptyLabel="No dividends received yet." />
      <DividendHistory entries={[]} caption="Dividends, error" state="error" onRetry={() => undefined} />
    </Stack>
  );
}
