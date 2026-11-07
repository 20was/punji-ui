import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AlertDialog, InlineConfirm, confirmMatches } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

describe('confirmMatches', () => {
  it('ignores case and outer spaces, and an empty match never confirms', () => {
    expect(confirmMatches('  delete ', 'DELETE')).toBe(true);
    expect(confirmMatches('delet', 'DELETE')).toBe(false);
    expect(confirmMatches('', '')).toBe(false);
    expect(confirmMatches('a b', 'a  b')).toBe(false);
  });
});

describe('InlineConfirm strength and match', () => {
  const base = { title: 'Delete list?', confirm: 'Delete list', cancel: 'Keep it', onConfirm: () => {}, onCancel: () => {} };

  it('is unchanged without the new props: danger button, confirm focused', () => {
    render(<InlineConfirm {...base} />);
    const btn = screen.getByRole('button', { name: 'Delete list' });
    expect(btn.className).toContain('danger');
    expect(document.activeElement).toBe(btn);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('caution uses the primary button; danger is the default', () => {
    render(<InlineConfirm {...base} strength="caution" />);
    const btn = screen.getByRole('button', { name: 'Delete list' });
    expect(btn.className).toContain('primary');
    expect(btn.className).not.toContain('danger');
  });

  it('match: the field takes focus, the confirm stays off until the word is typed, Enter confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<() => void>();
    render(<InlineConfirm {...base} onConfirm={onConfirm} match="DELETE" matchLabel="Type DELETE to confirm" fieldTestId="f" />);
    const field = screen.getByLabelText('Type DELETE to confirm');
    expect(document.activeElement).toBe(field);
    const confirm = screen.getByRole('button', { name: 'Delete list' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
    await user.keyboard('delete');
    expect(confirm.disabled).toBe(false);
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('f')).toBeTruthy();
  });

  it('Esc backs out of the field, and the label defaults to the match word', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn<() => void>();
    render(<InlineConfirm {...base} onCancel={onCancel} match="NABIL" />);
    expect(screen.getByLabelText('NABIL')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('busy holds Enter in the field', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<() => void>();
    render(<InlineConfirm {...base} onConfirm={onConfirm} match="x" busy />);
    await user.keyboard('x{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders on the server and has no serious axe violations', async () => {
    expect(renderToString(<InlineConfirm {...base} match="DELETE" />)).toContain('pu-confirm-match');
    const { container } = render(<InlineConfirm {...base} id="c" match="DELETE" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('AlertDialog strength and match', () => {
  const base = { open: true, title: 'Close account?', body: 'This cannot be undone.', confirmLabel: 'Close account', onConfirm: () => {}, onCancel: () => {} };

  it('without the new props it behaves as before (destructive starts on Cancel)', () => {
    render(<AlertDialog {...base} destructive />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Close account' }).className).toContain('danger');
  });

  it('strength decides the button: caution is primary even when destructive', () => {
    render(<AlertDialog {...base} destructive strength="caution" />);
    expect(screen.getByRole('button', { name: 'Close account' }).className).toContain('primary');
  });

  it('match: the field takes first focus, the confirm waits, Enter in the field confirms, Esc cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<() => void>();
    const onCancel = vi.fn<() => void>();
    render(<AlertDialog {...base} strength="danger" match="CLOSE" matchLabel="Type CLOSE" onConfirm={onConfirm} onCancel={onCancel} />);
    const field = screen.getByLabelText('Type CLOSE');
    expect(document.activeElement).toBe(field);
    const confirm = screen.getByRole('button', { name: 'Close account' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(confirm.className).toContain('danger');
    await user.keyboard('close');
    expect(confirm.disabled).toBe(false);
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('typed text is cleared when the dialog closes and reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AlertDialog {...base} match="CLOSE" />);
    await user.keyboard('close');
    rerender(<AlertDialog {...base} open={false} match="CLOSE" />);
    rerender(<AlertDialog {...base} match="CLOSE" />);
    expect((screen.getByRole('button', { name: 'Close account' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('has no serious axe violations', async () => {
    render(<AlertDialog {...base} match="CLOSE" />);
    expect(await seriousViolations(document.body)).toEqual([]);
  });
});
