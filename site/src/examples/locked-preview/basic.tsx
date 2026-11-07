import { Button } from '@punji/ui/button';
import { LockedPreview, LockedRow, LockedTile } from '@punji/ui/locked-preview';

// Shapes, not data: no name or number in the example. It is blurred, inert and hidden from assistive technology.
export default function Example() {
  return (
    <div style={{ inlineSize: 'min(32rem, 100%)' }}>
      <LockedPreview
        title="Today's most active brokers"
        stamp="Preview"
        lockTitle="Sign in to see broker activity"
        lockText="Which brokers bought and sold the most today, updated through the session."
        action={<Button size="sm">Sign in</Button>}
        foot="Free for members"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <LockedTile />
          <LockedTile />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <LockedRow key={i} index={i} />
        ))}
      </LockedPreview>
    </div>
  );
}
