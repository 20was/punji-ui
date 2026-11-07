import { useState } from 'react';
import { PresetRow, PresetTile } from '@punji/ui/preset-tile';
import { Stack } from '@punji/ui/stack';

const PRESETS = [
  { id: 'steady', title: 'Steady dividends', line: 'Pays out 40 to 80% of profit, year after year.', count: 14 },
  { id: 'value', title: 'Value', line: 'Priced under 12 times earnings.', count: 9 },
  { id: 'growth', title: 'Growing profits', line: 'EPS up at least 15% on last year.', count: 6 },
  { id: 'quality', title: 'Quality', line: 'High return on equity, low debt.', count: 0, locked: true },
];

// Each tile is a toggle with a live count. Pressed is the inverse surface; press again to clear. A locked tile has
// a lock and no count, and the page decides what a press means. On a phone the row scrolls sideways.
export default function Example() {
  const [pressed, setPressed] = useState<string | null>('steady');
  const [note, setNote] = useState('');
  return (
    <Stack>
      <PresetRow label="Ready-made screens">
        {PRESETS.map((p) => (
          <PresetTile
            key={p.id}
            title={p.title}
            line={p.line}
            {...(p.locked ? { locked: true, lockedLabel: 'Needs the Plus plan' } : { count: p.count })}
            pressed={pressed === p.id}
            describedBy={p.locked ? 'preset-note' : undefined}
            onClick={() => {
              if (p.locked) return setNote('Quality screens need the Plus plan.');
              setNote('');
              setPressed((now) => (now === p.id ? null : p.id));
            }}
          />
        ))}
      </PresetRow>
      <p id="preset-note" style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }} role="status">
        {note || (pressed ? `Applied: ${PRESETS.find((p) => p.id === pressed)?.title}.` : 'No screen applied.')}
      </p>
    </Stack>
  );
}
