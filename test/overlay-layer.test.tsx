import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AlertDialog, Dialog } from '../src/dialog/Dialog.tsx';
import { Drawer } from '../src/drawer/Drawer.tsx';
import { Sheet } from '../src/overlay/Overlay.tsx';

const html = document.documentElement;

function Stack() {
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <main data-testid="page">
        <button type="button" onClick={() => setDrawer(true)}>Open drawer</button>
      </main>
      <Drawer open={drawer} label="Edit" onClose={() => setDrawer(false)}>
        <button type="button" onClick={() => setSheet(true)}>Open sheet</button>
        <button type="button" onClick={() => setDrawer(false)}>Close drawer</button>
      </Drawer>
      <Sheet open={sheet} title="Sure?" onClose={() => setSheet(false)}>
        <button type="button" onClick={() => setSheet(false)}>Keep</button>
      </Sheet>
    </>
  );
}

describe('overlay layer', () => {
  it('restores the page scroll exactly after stacked overlays close in either order', async () => {
    html.style.overflow = 'scroll';
    html.style.paddingRight = '3px';
    render(<Stack />);
    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(html.style.overflow).toBe('hidden');
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    // Drawer closes first while the sheet is still open: the page stays locked.
    await userEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    expect(html.style.overflow).toBe('hidden');
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(html.style.overflow).toBe('scroll');
    expect(html.style.paddingRight).toBe('3px');
    html.style.overflow = '';
    html.style.paddingRight = '';
  });

  it('adds the scrollbar width as padding while locked', async () => {
    const inner = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1015);
    const client = vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(1000);
    render(<Sheet open title="T" onClose={() => {}}><button type="button">x</button></Sheet>);
    expect(html.style.paddingRight).toContain('15px');
    inner.mockRestore();
    client.mockRestore();
  });

  it('makes body siblings inert while open, and removes only what it added', async () => {
    const already = document.createElement('div');
    already.setAttribute('inert', '');
    document.body.append(already);
    render(<Stack />);
    const page = screen.getByTestId('page').parentElement!;
    expect(page.hasAttribute('inert')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(page.hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Edit' }).closest('[inert]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    expect(page.hasAttribute('inert')).toBe(false);
    expect(already.hasAttribute('inert')).toBe(true);
    already.remove();
  });

  it('keeps the page and the outer modal inert correctly when modals nest', async () => {
    render(<Stack />);
    const page = screen.getByTestId('page').parentElement!;
    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    const drawerRoot = screen.getByRole('dialog', { name: 'Edit' }).closest('body > *')!;
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    expect(drawerRoot.hasAttribute('inert')).toBe(true);
    expect(page.hasAttribute('inert')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(drawerRoot.hasAttribute('inert')).toBe(false);
    expect(page.hasAttribute('inert')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    expect(page.hasAttribute('inert')).toBe(false);
  });

  it('only the newest modal handles Esc and Tab', async () => {
    render(<Stack />);
    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Sure?' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeTruthy();
    // Focus went back to the control in the drawer that opened the sheet.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open sheet' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open drawer' }));
  });

  it('wraps Tab across position:fixed children in a Drawer', async () => {
    render(
      <Drawer open label="Edit" onClose={() => {}}>
        <button type="button">first</button>
        <button type="button" style={{ position: 'fixed' }}>last</button>
      </Drawer>,
    );
    screen.getByRole('button', { name: 'last' }).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }));
  });

  it('renders nothing on the server', async () => {
    const { renderToString } = await import('react-dom/server');
    expect(renderToString(<Sheet open title="T" onClose={() => {}}>x</Sheet>)).toBe('');
  });
});

function DialogHarness({ alert }: { alert?: boolean }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState('');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <p role="status">{log}</p>
      {alert ? (
        <AlertDialog open={open} destructive title="Close account?" body="This cannot be undone." confirmLabel="Close account" onConfirm={() => { setLog('confirmed'); setOpen(false); }} onCancel={() => { setLog('cancelled'); setOpen(false); }} />
      ) : (
        <Dialog open={open} title="Terms" body="Read these." onClose={() => setOpen(false)} actions={<button type="button" onClick={() => setOpen(false)}>Got it</button>}>
          <input aria-label="Name" />
        </Dialog>
      )}
    </>
  );
}

describe('Dialog', () => {
  it('is a modal dialog named by its title and described by its body', async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const d = screen.getByRole('dialog', { name: 'Terms' });
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-describedby')).toBe(screen.getByText('Read these.').id);
  });

  it('starts on the first control, traps Tab, closes on Esc and returns focus', async () => {
    render(<DialogHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    // input -> Got it -> hidden Close -> wraps to input
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on a click on the scrim', async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const back = screen.getByRole('dialog').parentElement!;
    act(() => {
      back.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AlertDialog', () => {
  it('is role alertdialog and starts on Cancel when the confirm is destructive', async () => {
    render(<DialogHarness alert />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const d = screen.getByRole('alertdialog', { name: 'Close account?' });
    expect(d.getAttribute('aria-describedby')).toBe(screen.getByText('This cannot be undone.').id);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('Esc is Cancel, the scrim does nothing, and Tab stays inside', async () => {
    render(<DialogHarness alert />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    act(() => {
      screen.getByRole('alertdialog').parentElement!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close account' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('status').textContent).toBe('cancelled');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('confirm runs onConfirm', async () => {
    render(<DialogHarness alert />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close account' }));
    expect(screen.getByRole('status').textContent).toBe('confirmed');
  });
});
