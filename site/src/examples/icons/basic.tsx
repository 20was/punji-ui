import { IconAlerts, IconHome, IconLock } from '@punji/ui/icons';
import { Stack } from '@punji/ui/stack';

// One import per glyph keeps the page small. Beside a word an icon is decorative; alone it needs a label.
export default function Example() {
  return (
    <Stack>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconHome /> Home
      </p>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconLock size="sm" /> Locked until you verify your phone
      </p>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconAlerts size="lg" label="3 new alerts" /> <span className="doc-muted">Labelled: an image named "3 new alerts"</span>
      </p>
    </Stack>
  );
}
