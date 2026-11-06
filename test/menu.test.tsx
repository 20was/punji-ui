import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LinkProvider, MenuButton } from '../src/index.ts';
import type { LinkComponent, MenuItem } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => vi.restoreAllMocks());

const Routed: LinkComponent = ({ href, children, ...rest }) => (
  <a {...rest} href={href} data-routed="yes">
    {children}
  </a>
);

const items = (spy = vi.fn<(arg?: string) => void>()): MenuItem[] => [
  { id: 'view', label: 'View statement', onSelect: () => spy('view') },
  { id: 'edit', label: 'Edit nickname', disabled: true },
  { id: 'share', label: 'Share', onSelect: () => spy('share') },
  { id: 'sep', type: 'separator' },
  { id: 'del', label: 'Close account', tone: 'danger', onSelect: () => spy('del') },
];

describe('MenuButton', () => {
  it('exposes the button as a menu button and the menu as role=menu named by it', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Actions" items={items()} />);
    const button = screen.getByRole('button', { name: 'Actions' });
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    await user.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu', { name: 'Actions' });
    expect(button.getAttribute('aria-controls')).toBe(menu.id);
    expect(screen.getByRole('menuitem', { name: 'Edit nickname' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('separator')).toBeTruthy();
  });

  it('opens on Enter, Space and ArrowDown on the first item, ArrowUp on the last', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Actions" items={items()} />);
    const button = screen.getByRole('button', { name: 'Actions' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'View statement' }));
    await user.keyboard('{Escape}');
    await user.keyboard(' ');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'View statement' }));
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'View statement' }));
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Close account' }));
  });

  it('moves with arrows (wrapping, skipping disabled), Home and End', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Actions" items={items()} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Share' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Close account' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'View statement' }));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Close account' }));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'View statement' }));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Close account' }));
  });

  it('jumps by typing the first letters, skipping disabled items', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Actions" items={items()} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('s');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Share' }));
    await new Promise((r) => setTimeout(r, 520));
    await user.keyboard('c');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Close account' }));
    await new Promise((r) => setTimeout(r, 520));
    await user.keyboard('e'); // "Edit nickname" is disabled
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Close account' }));
  });

  it('closes on Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Actions" items={items()} />);
    const button = screen.getByRole('button', { name: 'Actions' });
    await user.click(button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Tab and moves on from the button', async () => {
    const user = userEvent.setup();
    render(
      <>
        <MenuButton label="Actions" items={items()} />
        <button type="button">Next</button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
  });

  it('closes on an outside click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <MenuButton label="Actions" items={items()} />
        <p>Outside</p>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('runs the chosen item with Enter or a click, closes and refocuses the button; never a disabled one', async () => {
    const user = userEvent.setup();
    const spy = vi.fn<(arg?: string) => void>();
    render(<MenuButton label="Actions" items={items(spy)} />);
    const button = screen.getByRole('button', { name: 'Actions' });
    await user.click(button);
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalledWith('view');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'Edit nickname' }));
    expect(spy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('menuitem', { name: 'Close account' }));
    expect(spy).toHaveBeenLastCalledWith('del');
  });

  it('marks a destructive item with the danger tone', async () => {
    const user = userEvent.setup();
    render(<MenuButton label="Actions" items={items()} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menuitem', { name: 'Close account' }).classList.contains('pu-menu-danger')).toBe(true);
  });

  it('supports checkbox and radio items with aria-checked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn<(checked: boolean) => void>();
    const onSelect = vi.fn<() => void>();
    render(
      <MenuButton
        label="View"
        items={[
          { id: 'c', type: 'checkbox', label: 'Show zero balances', checked: true, onCheckedChange },
          { id: 'r1', type: 'radio', label: 'Compact', checked: false, onSelect },
          { id: 'r2', type: 'radio', label: 'Comfortable', checked: true, onSelect: () => {} },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show zero balances' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: 'Comfortable' }).getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByRole('menuitemradio', { name: 'Compact' }));
    expect(onSelect).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Show zero balances' }));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('names an icon-only row-actions button with its label', async () => {
    const user = userEvent.setup();
    render(<MenuButton iconOnly label="Actions for NABIL" items={items()} />);
    const button = screen.getByRole('button', { name: 'Actions for NABIL' });
    expect(button.getAttribute('aria-label')).toBe('Actions for NABIL');
    await user.click(button);
    expect(screen.getByRole('menu', { name: 'Actions for NABIL' })).toBeTruthy();
  });

  it('does not open when disabled and reports open changes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const { rerender } = render(<MenuButton label="Actions" items={items()} disabled />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.queryByRole('menu')).toBeNull();
    rerender(<MenuButton label="Actions" items={items()} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
  });

  it('renders link items as anchors: LinkProvider for in-app paths, plain for external, safeHref for the rest', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LinkProvider component={Routed}>
        <MenuButton
          label="Go"
          items={[
            { id: 'a', label: 'Accounts', href: '/accounts' },
            { id: 'b', label: 'Help centre', href: 'https://example.com/help', external: true },
            { id: 'c', label: 'Bad', href: 'javascript:alert(1)' },
          ]}
        />
      </LinkProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Go' }));
    const routed = screen.getByRole('menuitem', { name: 'Accounts' });
    expect(routed.tagName).toBe('A');
    expect(routed.getAttribute('href')).toBe('/accounts');
    expect(routed.getAttribute('data-routed')).toBe('yes');
    const ext = screen.getByRole('menuitem', { name: 'Help centre' });
    expect(ext.hasAttribute('data-routed')).toBe(false);
    expect(ext.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByRole('menuitem', { name: 'Bad' }).hasAttribute('href')).toBe(false);
  });

  it('has no serious axe violations closed or open', async () => {
    const user = userEvent.setup();
    const { container } = render(<MenuButton label="Actions" items={items()} />);
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(await seriousViolations(document.body)).toEqual([]);
  });
});
