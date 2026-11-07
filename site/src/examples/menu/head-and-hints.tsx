import { useState } from 'react';
import { MenuButton } from '@punji/ui/menu';

// A MenuHead names who the menu is about (not an item: arrow keys skip it). `hint` is quiet text at the end, `next`
// a chevron for a link to another page, `busy` an item that is working (reachable, not chosen), `lang` a label in
// another language. `open` and `onOpenChange` let the page control the menu.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 'var(--pu-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
      <MenuButton
        label="Account"
        open={open}
        onOpenChange={setOpen}
        items={[
          { type: 'head', id: 'who', title: 'Bishwas Adhikari', sub: 'bishwas@example.com', lead: 'BA' },
          { id: 'profile', label: 'Profile and security', href: '#profile', next: true, hint: 'PIN, devices' },
          { id: 'sync', label: saving ? 'Saving' : 'Save layout', busy: saving, onSelect: () => setSaving(true) },
          { id: 'ne', label: 'नेपाली', lang: 'ne', onSelect: () => {} },
          { id: 'sep', type: 'separator' },
          { id: 'out', label: 'Sign out', tone: 'danger', onSelect: () => {} },
        ]}
      />
      <span style={{ fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>{open ? 'Open' : 'Closed'} (controlled)</span>
    </div>
  );
}
