import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PresetRow, PresetTile } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

describe('PresetTile', () => {
  it('is a toggle button with its name, live count and line', async () => {
    const onClick = vi.fn<() => void>();
    const { rerender } = render(<PresetTile title="Steady dividends" count={12} line="Pays out, year after year." pressed={false} onClick={onClick} countTestId="n" />);
    const tile = screen.getByRole('button', { name: /Steady dividends/ });
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('n').textContent).toBe('12');
    expect(tile.textContent).toContain('Pays out, year after year.');
    await userEvent.click(tile);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<PresetTile title="Steady dividends" count={9} pressed onClick={onClick} countTestId="n" />);
    expect(screen.getByTestId('n').textContent).toBe('9');
    expect(screen.getByRole('button', { name: /Steady dividends/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows no count while it loads', () => {
    render(<PresetTile title="Value" pressed={false} onClick={() => {}} countTestId="n" />);
    expect(screen.getByTestId('n').textContent).toBe('');
  });

  it('a locked tile has a lock in words and no count, and a press is still the page to answer', async () => {
    const onClick = vi.fn<() => void>();
    render(<PresetTile title="Quality" count={99} locked lockedLabel="Not included on this account" pressed={false} onClick={onClick} countTestId="n" lockTestId="lock" />);
    expect(screen.queryByTestId('n')).toBeNull();
    expect(screen.getByTestId('lock')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Quality.*Not included on this account/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is reached with Tab and chosen with Enter and Space, and describedBy points at the page note', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <>
        <p id="why">Needs the Plus plan.</p>
        <PresetTile title="Quality" locked pressed={false} onClick={onClick} describedBy="why" />
      </>,
    );
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    expect(screen.getByRole('button')).toHaveAccessibleDescription('Needs the Plus plan.');
    await userEvent.keyboard('{Enter} ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('PresetRow is a named group of tiles', () => {
    render(
      <PresetRow label="Screens" testId="row">
        <PresetTile title="A" count={1} pressed={false} onClick={() => {}} />
        <PresetTile title="B" count={2} pressed onClick={() => {}} />
      </PresetRow>,
    );
    const group = screen.getByRole('group', { name: 'Screens' });
    expect(group.querySelectorAll('button')).toHaveLength(2);
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <PresetRow label="Screens">
        <PresetTile title="A" count={1} line="line" pressed={false} onClick={() => {}} />
        <PresetTile title="B" locked lockedLabel="Locked" pressed={false} onClick={() => {}} />
      </PresetRow>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
