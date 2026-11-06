import { MenuButton } from '@punji/ui/menu';

// An account menu: links go through the link adapter (a router link when a LinkProvider is above), an action, a
// separator, and a destructive item last. Open it with Enter, Space or the arrow keys.
export default function Example() {
  return (
    <MenuButton
      label="Account"
      items={[
        { id: 'profile', label: 'Profile and security', href: '#profile' },
        { id: 'statements', label: 'Statements', href: '#statements' },
        { id: 'help', label: 'Help centre', href: 'https://example.com/help', external: true },
        { id: 'export', label: 'Export transactions', onSelect: () => {} },
        { id: 'edit', label: 'Change PIN', disabled: true },
        { id: 'sep', type: 'separator' },
        { id: 'signout', label: 'Sign out', tone: 'danger', onSelect: () => {} },
      ]}
    />
  );
}
