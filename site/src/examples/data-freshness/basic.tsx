import { DataFreshness } from '@punji/ui/data-freshness';
import { Stack } from '@punji/ui/stack';

// A fixed instant keeps the page stable; in an app, pass the time your feed reports.
const asOf = new Date(Date.now() - 2 * 60_000);

export default function Example() {
  return (
    <Stack>
      <DataFreshness state="live" asOf={asOf} />
      <DataFreshness state="delayed" delayMinutes={15} asOf={asOf} />
      <DataFreshness state="end-of-day" asOf={asOf} />
      <DataFreshness state="stale" asOf={asOf} />
      <DataFreshness state="offline" asOf={asOf} />
    </Stack>
  );
}
