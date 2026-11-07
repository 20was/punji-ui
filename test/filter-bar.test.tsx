import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterBar, useUrlFilters, type FilterBarField, type FilterBarGroup, type FilterBarValues, type FilterSchema } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const fields: FilterBarField[] = [
  { kind: 'multi', id: 'sector', label: 'Sector', pinned: true, options: [{ value: 'banks', label: 'Commercial Banks', count: 20 }, { value: 'hydro', label: 'Hydro Power', count: 35 }] },
  { kind: 'range', id: 'pe', label: 'Price to earnings', chipLabel: 'P/E', group: 'valuation', why: 'Price over earnings per share.', fractionDigits: 2, track: { min: '0', max: '60', step: '1' } },
  { kind: 'range', id: 'npl', label: 'Non-performing loans', chipLabel: 'NPL', group: 'bank', disabled: true },
  { kind: 'boolean', id: 'breakout', label: 'Breakout', group: 'flags' },
];
const groups: FilterBarGroup[] = [
  { id: 'valuation', title: 'Valuation' },
  { id: 'bank', title: 'Bank health', column: 2, note: 'Choose only banks under Sector first.' },
  { id: 'flags', title: 'Flags', column: 2 },
];
const schema = { sector: { kind: 'multi', options: ['banks', 'hydro'] }, pe: { kind: 'range', fractionDigits: 2 }, breakout: { kind: 'boolean' } } as const satisfies FilterSchema;

function Bar({ initial = '', count }: { initial?: string; count?: (v: FilterBarValues) => number }) {
  const [search, setSearch] = useState(initial);
  const url = useUrlFilters({ schema, get: () => search, set: setSearch });
  return (
    <>
      <FilterBar fields={fields} groups={groups} values={url.filters} onChange={(next) => url.setFilters(next as never)} {...(count ? { count } : {})} testId="bar" />
      <output data-testid="q">{url.search}</output>
    </>
  );
}

const query = () => screen.getByTestId('q').textContent;

describe('FilterBar', () => {
  it('shows a pinned list chip, the set filters as chips, and Add filter', () => {
    render(<Bar initial="pe=..12&breakout=1" />);
    const bar = screen.getByRole('group', { name: 'Filters' });
    expect(within(bar).getByRole('button', { name: /Sector/ })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: /P\/E.*up to 12/ })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Remove Breakout' })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Add filter' })).toBeTruthy();
  });

  it('lists the filters by group, with a disabled item explained by its group note', async () => {
    render(<Bar />);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    const menu = screen.getByRole('group', { name: 'Add filter', hidden: false });
    expect(menu).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Valuation' })).toBeTruthy();
    const npl = screen.getByRole('button', { name: 'Non-performing loans' });
    expect(npl).toBeDisabled();
    expect(npl).toHaveAccessibleDescription('Choose only banks under Sector first.');
  });

  it('a range: pick it, type the ends, apply, and the address holds exact decimals', async () => {
    render(<Bar count={(v) => (v.pe ? 3 : 10)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(screen.getByRole('button', { name: 'Price to earnings' }));
    expect(screen.getByRole('dialog', { name: 'Price to earnings' })).toBeTruthy();
    expect(screen.getByLabelText('From')).toHaveFocus();
    await userEvent.type(screen.getByLabelText('From'), '5.50');
    await userEvent.type(screen.getByLabelText('To'), '12');
    expect(screen.getByRole('button', { name: 'Show 3 results' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Show 3 results' }));
    expect(query()).toBe('pe=5.5..12');
    expect(screen.queryByRole('dialog')).toBeNull();
    // The chip edits it again, with the ends back in the fields.
    await userEvent.click(screen.getByRole('button', { name: /P\/E/ }));
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('5.5');
  });

  it('shows "No results" and keeps the action, and says when To is under From', async () => {
    render(<Bar count={() => 0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(screen.getByRole('button', { name: 'Price to earnings' }));
    await userEvent.type(screen.getByLabelText('From'), '9');
    expect(screen.getByRole('button', { name: 'No results' })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('To'), '4');
    expect(screen.getByRole('alert').textContent).toBe('To must be at least From.');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('rejects a number with too many decimals instead of rounding it', async () => {
    render(<Bar />);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(screen.getByRole('button', { name: 'Price to earnings' }));
    await userEvent.type(screen.getByLabelText('To'), '1.234');
    expect(screen.getByRole('alert').textContent).toContain('2 decimal places');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('the slider and the fields agree', async () => {
    render(<Bar />);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(screen.getByRole('button', { name: 'Price to earnings' }));
    fireEvent.change(screen.getByLabelText('To (slider)'), { target: { value: '12' } });
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('12');
  });

  it('Clear removes the range and closes the editor', async () => {
    render(<Bar initial="pe=1..2" />);
    await userEvent.click(screen.getByRole('button', { name: /P\/E/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(query()).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a yes/no filter turns on from the menu and off from its chip', async () => {
    render(<Bar />);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(screen.getByRole('button', { name: 'Breakout' }));
    expect(query()).toBe('breakout=1');
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Breakout' }));
    expect(query()).toBe('');
  });

  it('a list applies as you tick it, in the schema order, and the chip says what is chosen', async () => {
    render(<Bar />);
    await userEvent.click(screen.getByRole('button', { name: /Sector/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Hydro Power/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Commercial Banks/ }));
    expect(query()).toBe('sector=banks%2Chydro');
    expect(screen.getByRole('button', { name: /Sector.*2 chosen/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(query()).toBe('');
    expect(screen.getByRole('button', { name: /Sector.*All/ })).toBeTruthy();
  });

  it('Esc closes a popover and puts focus back on the button that opened it', async () => {
    render(<Bar />);
    const add = screen.getByRole('button', { name: 'Add filter' });
    await userEvent.click(add);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(add).toHaveFocus();
  });

  it('pressing the opener again closes it', async () => {
    render(<Bar />);
    const add = screen.getByRole('button', { name: 'Add filter' });
    await userEvent.click(add);
    await userEvent.click(add);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a shared link with its filters in place', () => {
    render(<Bar initial="?sector=hydro&pe=3..&breakout=1&sort=pe" />);
    expect(screen.getByRole('button', { name: /Sector.*Hydro Power/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /P\/E.*from 3/ })).toBeTruthy();
    expect(query()).toBe('breakout=1&pe=3..&sector=hydro');
  });

  it('takes replaced words', async () => {
    const onChange = vi.fn<() => void>();
    render(<FilterBar fields={fields} values={{}} onChange={onChange} labels={{ add: 'फिल्टर थप्नुहोस्', close: 'बन्द' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'फिल्टर थप्नुहोस्' }));
    expect(screen.getByRole('button', { name: 'बन्द' })).toBeTruthy();
  });

  it('has no serious axe violations, closed and with the menu and an editor open', async () => {
    const { container } = render(<Bar initial="pe=..12&breakout=1" />);
    expect(await seriousViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    expect(await seriousViolations(document.body)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: /^Price to earnings/ }));
    expect(await seriousViolations(document.body)).toEqual([]);
  });
});
