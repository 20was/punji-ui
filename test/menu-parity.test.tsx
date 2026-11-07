import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MenuButton, MenuHead, MenuItemRow, MenuList, MenuSeparator, RowMenu, SheetMenuButton } from '../src/index.ts';
import type { MenuItem } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const phone = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} }));

const items = (spy = vi.fn<(arg?: string) => void>()): MenuItem[] => [
  { type: 'head', id: 'who', title: 'Bishwas Adhikari', sub: 'bishwas@example.com', lead: 'BA' },
  { id: 'profile', label: 'Profile', href: '#profile', next: true, hint: 'PIN, devices' },
  { id: 'busy', label: 'Syncing', busy: true, onSelect: () => spy('busy') },
  { id: 'ne', label: 'नेपाली', lang: 'ne', onSelect: () => spy('ne') },
  { id: 'out', label: 'Sign out', tone: 'danger', onSelect: () => spy('out') },
];

describe('MenuButton parity', () => {
  it('renders a head that is not an item, hint text, a next chevron, lang and a busy item', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Account" items={items()} />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(screen.getAllByRole('menuitem').map((n) => n.textContent)).toEqual(['ProfilePIN, devices', 'Syncing', 'नेपाली', 'Sign out']);
    expect(screen.getByText('Bishwas Adhikari')).toBeTruthy();
    const profile = screen.getByRole('menuitem', { name: /Profile/ });
    expect(profile.querySelector('.pu-menu-hint')?.textContent).toBe('PIN, devices');
    expect(profile.querySelector('.pu-menu-end')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'नेपाली' }).getAttribute('lang')).toBe('ne');
    const busy = screen.getByRole('menuitem', { name: 'Syncing' });
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(busy.getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps a busy item reachable but does not choose it; the head is skipped by the arrows', async () => {
    const user = userEvent.setup();
    const spy = vi.fn<(arg?: string) => void>();
    render(<MenuButton label="Account" items={items(spy)} />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(document.activeElement?.textContent).toContain('Profile');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('Syncing');
    await user.keyboard('{Enter}');
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(document.activeElement?.textContent).toContain('Profile');
  });

  it('types a letter against the label, not the hint', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Account" items={[{ id: 'a', label: 'Alpha', hint: 'zeta' }, { id: 'z', label: 'Zulu' }]} />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    await user.keyboard('z');
    expect(document.activeElement?.textContent).toBe('Zulu');
  });

  it('is controlled with open and onOpenChange, and returns focus to the button on Escape', async () => {
    const user = userEvent.setup();
    const changes: boolean[] = [];
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            external
          </button>
          <MenuButton
            label="Actions"
            open={open}
            onOpenChange={(next) => {
              changes.push(next);
              setOpen(next);
            }}
            items={[{ id: 'a', label: 'One', onSelect: () => {} }]}
          />
        </>
      );
    }
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'external' }));
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Actions' }).getAttribute('aria-expanded')).toBe('true');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Actions' }));
    expect(changes).toEqual([false]);
  });

  it('a controlled menu stays closed until the parent opens it', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<MenuButton label="Actions" open={false} onOpenChange={onOpenChange} items={[{ id: 'a', label: 'One' }]} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('has no serious axe violations with a head, hints and a busy item', async () => {
    const user = userEvent.setup();
    const { container } = render(<MenuButton label="Account" items={items()} />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(await seriousViolations(document.body)).toEqual([]);
    expect(container).toBeTruthy();
  });
});

const rows = (spy: () => void) => [
  { id: 'view', label: 'View stock', onSelect: spy },
  { id: 'rm', label: 'Remove', tone: 'danger' as const, onSelect: () => {} },
];

describe('phone sheet', () => {
  it('stays a popover on a wide screen', async () => {
    phone(false);
    const user = userEvent.setup();
    render(<SheetMenuButton label="Actions for NABIL" iconOnly sheetTitle="NABIL" items={rows(() => {})} />);
    const button = screen.getByRole('button', { name: 'Actions for NABIL' });
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    await user.click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('opens as the Sheet under 768px with the menu inside, traps focus and returns it to the button', async () => {
    phone(true);
    const user = userEvent.setup();
    const spy = vi.fn<() => void>();
    render(
      <>
        <SheetMenuButton label="Actions for NABIL" iconOnly sheetTitle="NABIL" items={rows(spy)} />
        <button type="button">outside</button>
      </>,
    );
    const button = screen.getByRole('button', { name: 'Actions for NABIL' });
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: 'NABIL' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('[role="menu"]')).toBeTruthy();
    // The page behind is inert (inert, then scroll lock, then focus scope).
    expect(document.documentElement.style.overflow === 'hidden' || document.body.style.overflow === 'hidden').toBe(true);
    expect(document.activeElement?.textContent).toBe('View stock');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('Remove');
    await user.keyboard('{ArrowUp}{Enter}');
    expect(spy).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  it('closes on Escape and returns focus to the button', async () => {
    phone(true);
    const user = userEvent.setup();
    render(<SheetMenuButton label="Actions" items={rows(() => {})} />);
    const button = screen.getByRole('button', { name: 'Actions' });
    await user.click(button);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  it('RowMenu takes composed items with a close function and fits the Sheet', async () => {
    phone(true);
    const user = userEvent.setup();
    const onSelect = vi.fn<() => void>();
    render(
      <RowMenu label="More for NICA" title="NICA" testId="row">
        {(close) => (
          <>
            <MenuItemRow onSelect={onSelect}>Mark as read</MenuItemRow>
            <MenuItemRow onSelect={() => close()} busy>Working</MenuItemRow>
          </>
        )}
      </RowMenu>,
    );
    await user.click(screen.getByTestId('row'));
    expect(screen.getByRole('dialog', { name: 'NICA' })).toBeTruthy();
    expect(await seriousViolations(document.body)).toEqual([]);
    await user.click(screen.getByRole('menuitem', { name: 'Mark as read' }));
    expect(onSelect).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('MenuList', () => {
  it('is a role=menu with the keyboard, the head, hints and separators, without a button', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    const onSelect = vi.fn<() => void>();
    const { container } = render(
      <MenuList label="Account menu" onLeave={onLeave} onClose={onClose}>
        <MenuHead title="Bishwas" sub="b@example.com" lead="B" />
        <MenuItemRow to="#settings" next hint="PIN">Settings</MenuItemRow>
        <MenuItemRow href="https://example.com" newTab="opens in a new tab">Help</MenuItemRow>
        <MenuSeparator />
        <MenuItemRow onSelect={onSelect}>Export</MenuItemRow>
      </MenuList>,
    );
    expect(screen.getByRole('menu', { name: 'Account menu' })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.activeElement?.textContent).toContain('Settings');
    const help = screen.getByRole('menuitem', { name: /Help/ });
    expect(help.getAttribute('target')).toBe('_blank');
    expect(help.getAttribute('rel')).toContain('noopener');
    expect(help.textContent).toContain('opens in a new tab');
    await user.keyboard('{End}');
    expect(document.activeElement?.textContent).toBe('Export');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toContain('Settings');
    await user.keyboard('{Home}{Enter}');
    expect(await seriousViolations(container)).toEqual([]);
    await user.keyboard('{Tab}');
    expect(onLeave).toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', { name: 'Export' }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders an items array too and handles Escape only when asked', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn<() => void>();
    render(<MenuList label="List" items={[{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }]} onEscape={onEscape} />);
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledOnce();
  });
});
