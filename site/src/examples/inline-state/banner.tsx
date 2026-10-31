import { InlineState } from '@punji/ui/inline-state';
import { Button } from '@punji/ui/button';
import { Stack } from '@punji/ui/stack';

// Row layout: a one-line banner with its action at the end. role="status" for a state that changes; "alert" for a failure.
export default function Example() {
  return (
    <Stack>
      <InlineState icon="offline" tone="warn" layout="row" role="status" title="Offline. Prices last updated 11:02." />
      <InlineState
        icon="clock"
        tone="warn"
        layout="row"
        role="status"
        title="Prices are 15 minutes old"
        actions={<Button size="sm" variant="secondary">Refresh</Button>}
      />
      <InlineState
        icon="error"
        tone="error"
        layout="row"
        role="alert"
        title="Your watchlist did not load"
        actions={<Button size="sm" variant="secondary">Try again</Button>}
      />
      <InlineState icon="check" layout="row" role="status" title="Saved" />
    </Stack>
  );
}
