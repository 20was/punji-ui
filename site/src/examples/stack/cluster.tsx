import { Button } from '@punji/ui/button';
import { Cluster } from '@punji/ui/stack';
import { StatusPill } from '@punji/ui/status-pill';

// A row that wraps instead of overflowing. justify="between" puts the first child at one end and the last at the other.
export default function Example() {
  return (
    <Cluster as="section" aria-label="Order actions" justify="between">
      <Cluster gap={2}>
        <StatusPill>Open</StatusPill>
        <StatusPill>Limit order</StatusPill>
      </Cluster>
      <Cluster gap={2}>
        <Button variant="secondary">Edit</Button>
        <Button variant="danger">Cancel order</Button>
      </Cluster>
    </Cluster>
  );
}
