import { useState } from 'react';
import { Field } from '@punji/ui/fields';
import { Stack } from '@punji/ui/stack';
import { formatHotkey, useHotkeys } from '@punji/ui/hooks';

export default function Example() {
  const [last, setLast] = useState('Nothing yet');
  const [note, setNote] = useState('');
  useHotkeys([
    { keys: 'b', handler: () => setLast('B: open a buy ticket') },
    { keys: 's', handler: () => setLast('S: open a sell ticket') },
    { keys: 'mod+j', handler: () => setLast(`${formatHotkey('mod+j')}: jump to the order book`) },
  ]);
  return (
    <Stack>
      <Field label="Order note" value={note} onChange={setNote} hint="Typing B or S here types; Ctrl+J or ⌘J still fires" />
      <p className="doc-muted" role="status">
        Last shortcut: <strong>{last}</strong>
      </p>
    </Stack>
  );
}
