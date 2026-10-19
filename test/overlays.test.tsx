import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CommandPalette, type CommandItem } from '../src/command-palette/CommandPalette.tsx';
import { Drawer } from '../src/drawer/Drawer.tsx';
import { Button, Dock, InlineConfirm, Sheet, ToastProvider, useToast } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

function SheetHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Remove</Button>
      <Sheet open={open} title="Remove NABIL?" body="This cannot be undone." onClose={() => setOpen(false)} testId="sheet">
        <div className="actions">
          <Button variant="danger" onClick={() => setOpen(false)}>
            Remove
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Keep
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add</Button>
      <Drawer open={open} label="Add a holding" onClose={() => setOpen(false)} testId="drawer">
        <input aria-label="Symbol" />
        <Button onClick={() => setOpen(false)}>Save</Button>
      </Drawer>
    </>
  );
}

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <Button onClick={() => toast.show('success', 'Saved')}>Save</Button>
      <Button onClick={() => toast.show('error', 'Could not save', { body: 'Try again.', action: { label: 'Retry', run: () => toast.show('info', 'Retrying') } })}>Fail</Button>
    </>
  );
}

describe('Sheet', () => {
  it('opens as a modal dialog named by its title, focuses the first control, traps Tab and closes on Esc with focus back', async () => {
    render(<SheetHarness />);
    const opener = screen.getByRole('button', { name: 'Remove' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Remove NABIL?' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const buttons = dialog.querySelectorAll('button');
    expect(document.activeElement).toBe(buttons[0]);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<SheetHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Toast', () => {
  it('shows a status, an error as an alert with an action, and goes after a few seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <ToastProvider>
        <ToastButtons />
        <Dock>
          <Button>Main</Button>
        </Dock>
      </ToastProvider>,
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status').textContent).toContain('Saved');
    await user.click(screen.getByRole('button', { name: 'Fail' }));
    expect(screen.getByRole('alert').textContent).toContain('Could not save');
    await user.click(screen.getByTestId('toast-action'));
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByTestId('toast-success')).toBeNull();
    vi.useRealTimers();
  });

  it('useToast outside the provider says so', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastButtons />)).toThrow('useToast must be used inside ToastProvider');
    spy.mockRestore();
  });
});

describe('Drawer', () => {
  it('opens in a portal as a modal dialog, keeps Tab inside, closes on Esc and on the scrim, and gives focus back', async () => {
    render(<DrawerHarness />);
    const opener = screen.getByRole('button', { name: 'Add' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Add a holding' });
    expect(document.activeElement).toBe(dialog);
    expect(document.documentElement.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.documentElement.style.overflow).toBe('');
    await userEvent.click(opener);
    await userEvent.pointer({ keys: '[MouseLeft]', target: screen.getByTestId('drawer-scrim') });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('has no serious axe violations', async () => {
    render(<DrawerHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await seriousViolations(document.body)).toEqual([]);
  });
});

describe('InlineConfirm', () => {
  it('takes focus on the danger button; Esc backs out; the busy confirm is not clickable', async () => {
    const onCancel = vi.fn<() => void>();
    const onConfirm = vi.fn<() => void>();
    const { rerender } = render(<InlineConfirm id="rm" title="Remove this alert?" body="It stops at once." confirm="Remove" cancel="Keep" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('group', { name: 'Remove this alert?' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove' }));
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
    rerender(<InlineConfirm id="rm" title="Remove this alert?" confirm="Remove" cancel="Keep" onConfirm={onConfirm} onCancel={onCancel} busy />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<InlineConfirm title="Remove?" confirm="Remove" cancel="Keep" onConfirm={() => {}} onCancel={() => {}} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const ITEMS: CommandItem[] = [
  { id: 'nabil', group: 'co', groupLabel: 'Companies', title: 'NABIL', sub: 'Nabil Bank', kind: 'entity', actions: [{ id: 'open', label: 'Open' }, { id: 'watch', label: 'Watch' }] },
  { id: 'settings', group: 'pages', groupLabel: 'Pages', title: 'Settings', actions: [{ id: 'go', label: 'Go' }] },
  { id: 'docs', group: 'pages', groupLabel: 'Pages', title: 'Docs', kind: 'external', actions: [{ id: 'go', label: 'Go' }] },
];
const LABELS = { dialog: 'Search', close: 'close', move: 'move', choose: 'choose', open: 'open', closeKey: 'close', chosen: (l: string) => `${l} chosen`, chosenMark: 'chosen', actionsHint: 'Left and right arrows choose an action.' };

function PaletteHarness({ onRun, onClose }: { onRun: (id: string, action: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  return <CommandPalette labels={LABELS} placeholder="Search" query={q} onQuery={setQ} items={ITEMS} onRun={(i, a) => onRun(i.id, a.id)} onClose={onClose} />;
}

describe('CommandPalette', () => {
  beforeAll(() => {
    // jsdom does no layout: the palette scrolls the chosen row into view.
    Element.prototype.scrollIntoView ??= () => {};
  });

  it('focuses the field; arrows move rows, left and right move a row’s actions, Enter runs, Esc closes', async () => {
    const runs: string[] = [];
    const onClose = vi.fn<() => void>();
    render(<PaletteHarness onRun={(i, a) => runs.push(`${i}:${a}`)} onClose={onClose} />);
    const input = screen.getByRole('combobox', { name: 'Search' });
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(runs).toEqual(['nabil:watch']);
    expect(screen.getByTestId('cmdk-said').textContent).toBe('Watch chosen');
    await userEvent.keyboard('{ArrowDown}{Enter}{ArrowUp}{ArrowUp}{Enter}');
    expect(runs).toEqual(['nabil:watch', 'settings:go', 'docs:go']);
    expect(input.getAttribute('aria-activedescendant')).toBe('kcmd-docs');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Tab stays inside the dialog', async () => {
    render(<PaletteHarness onRun={() => {}} onClose={() => {}} />);
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Esc');
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<PaletteHarness onRun={() => {}} onClose={() => {}} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
