import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FilterMenu, FilterMenuGroup, FilterMenuItem } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

function Menu({ onPick = () => {} }: { onPick?: (id: string) => void }) {
  return (
    <FilterMenu label="Add filter" testId="menu">
      <FilterMenuGroup title="Valuation">
        <FilterMenuItem on onLabel="set" onClick={() => onPick('pe')} aside="12">
          P/E
        </FilterMenuItem>
        <FilterMenuItem onClick={() => onPick('pb')}>P/B</FilterMenuItem>
      </FilterMenuGroup>
      <FilterMenuGroup title="Bank health" column={2} note="Choose only banks under Sector first.">
        <FilterMenuItem disabled onClick={() => onPick('npl')}>
          NPL
        </FilterMenuItem>
        <FilterMenuItem disabled onClick={() => onPick('car')}>
          CAR
        </FilterMenuItem>
      </FilterMenuGroup>
      <FilterMenuGroup title="Flags" column={2}>
        <FilterMenuItem toggle on onClick={() => onPick('breakout')}>
          Breakout
        </FilterMenuItem>
      </FilterMenuGroup>
    </FilterMenu>
  );
}

describe('FilterMenu', () => {
  it('lists groups under their headings and puts column 2 groups in a second column', () => {
    render(<Menu />);
    expect(screen.getByRole('group', { name: 'Add filter' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Valuation' })).toBeTruthy();
    const cols = screen.getByTestId('menu').querySelectorAll('.pu-filter-menu-col');
    expect(cols).toHaveLength(2);
    expect(cols[0]!.textContent).toContain('P/E');
    expect(cols[1]!.textContent).toContain('NPL');
    expect(cols[1]!.textContent).toContain('Breakout');
  });

  it('uses one column when no group asks for the second', () => {
    render(
      <FilterMenu label="m" testId="m">
        <FilterMenuGroup title="A">
          <FilterMenuItem onClick={() => {}}>x</FilterMenuItem>
        </FilterMenuGroup>
      </FilterMenu>,
    );
    expect(screen.getByTestId('m').querySelectorAll('.pu-filter-menu-col')).toHaveLength(1);
  });

  it('shows an aside beside the name', () => {
    render(<Menu />);
    expect(screen.getByRole('button', { name: 'P/E 12, set' })).toBeTruthy();
  });

  it('a disabled item is announced with the group note as its description, and cannot be chosen', async () => {
    const onPick = vi.fn<() => void>();
    render(<Menu onPick={onPick} />);
    const npl = screen.getByRole('button', { name: 'NPL' });
    expect(npl).toBeDisabled();
    expect(npl).toHaveAccessibleDescription('Choose only banks under Sector first.');
    await userEvent.click(npl);
    expect(onPick).not.toHaveBeenCalled();
    // An enabled item has no description it does not need.
    expect(screen.getByRole('button', { name: 'P/B' })).not.toHaveAccessibleDescription();
  });

  it('a toggle is a pressed button; a range that is set is marked in words for assistive technology by its state', async () => {
    const onPick = vi.fn<() => void>();
    render(<Menu onPick={onPick} />);
    const flag = screen.getByRole('button', { name: 'Breakout' });
    expect(flag).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(flag);
    expect(onPick).toHaveBeenCalledWith('breakout');
    expect(screen.getByRole('button', { name: 'P/B' })).not.toHaveAttribute('aria-pressed');
  });

  it('Tab then Enter and Space choose; arrows, Home and End move between the enabled items', async () => {
    const onPick = vi.fn<() => void>();
    render(<Menu onPick={onPick} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'P/E 12, set' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'P/B' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    // NPL and CAR are disabled and skipped.
    expect(screen.getByRole('button', { name: 'Breakout' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Breakout' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'P/E 12, set' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Breakout' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(onPick).toHaveBeenLastCalledWith('pb');
    await userEvent.keyboard(' ');
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<Menu />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
