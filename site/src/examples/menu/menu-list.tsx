import { useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { MenuHead, MenuItemRow, MenuList, MenuSeparator } from '@punji/ui/menu';
import { Popover, PopoverAnchor } from '@punji/ui/popover';

// MenuList is the role="menu" list on its own. Here it sits in a Popover: the Popover owns Esc and the outside click,
// MenuList owns the arrow keys, Home, End, typeahead and Tab (onLeave). Choosing an item calls onClose.
export default function Example() {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  return (
    <div style={{ minHeight: '15rem' }}>
      <PopoverAnchor>
        <Button ref={anchor} variant="secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          Account
        </Button>
        <Popover open={open} anchor={anchor} onClose={close} label="Account menu" role="none" align="start">
          <MenuList label="Account menu" onLeave={close} onClose={close}>
            <MenuHead title="Bishwas Adhikari" sub="bishwas@example.com" lead="BA" />
            <MenuItemRow to="#settings" next hint="PIN, devices">
              Settings
            </MenuItemRow>
            <MenuItemRow href="https://example.com/help" newTab="opens in a new tab">
              Help centre
            </MenuItemRow>
            <MenuItemRow busy>Syncing</MenuItemRow>
            <MenuSeparator />
            <MenuItemRow tone="danger" onSelect={() => {}}>
              Sign out
            </MenuItemRow>
          </MenuList>
        </Popover>
      </PopoverAnchor>
    </div>
  );
}
