import { CountBadge, StatusPill } from '@punji/ui/status-pill';
import { Cluster, Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      {/* marker: a state beside a page title. The outlined pill's dot carries the state; the words say it too. */}
      <Cluster>
        <StatusPill marker="live">Market open</StatusPill>
        <StatusPill marker="warn">Prices delayed</StatusPill>
        <StatusPill marker="off">Market closed</StatusPill>
      </Cluster>
      {/* href: a pill as a link, for example the sector a stock belongs to. */}
      <Cluster>
        <StatusPill href="https://example.com/sectors/banking" tone="info">
          Commercial banks
        </StatusPill>
      </Cluster>
      {/* CountBadge: how many are waiting. The heading says what; label says it again for screen readers. */}
      <h3 style={{ margin: 0 }}>
        Waiting for you <CountBadge count={2} label="2 waiting" />
      </h3>
    </Stack>
  );
}
