import { MenuItemRow, MenuSeparator } from '@punji/ui/menu';
import { RowMenu, SheetMenuButton } from '@punji/ui/row-menu';

// Under 768px the menu opens as the bottom Sheet (44px rows over the page) instead of a popover; wider, it is the
// usual popover. SheetMenuButton (a MenuButton with the phone sheet), or RowMenu, the shorthand for a row's "..." button.
export default function Example() {
  return (
    <div style={{ display: 'flex', gap: 'var(--pu-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
      <SheetMenuButton
        label="Actions for NABIL"
        iconOnly
        sheetTitle="NABIL"
        items={[
          { id: 'view', label: 'View stock', href: '#nabil' },
          { id: 'alert', label: 'Set a price alert', onSelect: () => {} },
          { id: 'sep', type: 'separator' },
          { id: 'rm', label: 'Remove from watchlist', tone: 'danger', onSelect: () => {} },
        ]}
      />
      <RowMenu label="More for NICA" title="NICA">
        {(close) => (
          <>
            <MenuItemRow to="#nica" next>
              Open NICA
            </MenuItemRow>
            <MenuItemRow onSelect={() => close()} hint="Today">
              Mark as read
            </MenuItemRow>
            <MenuSeparator />
            <MenuItemRow tone="danger" onSelect={() => {}}>
              Delete
            </MenuItemRow>
          </>
        )}
      </RowMenu>
    </div>
  );
}
