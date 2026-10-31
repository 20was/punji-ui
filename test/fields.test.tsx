import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CompanySearch } from '../src/company-search/CompanySearch.tsx';
import { DateField, Field, NumberField, SelectField, SymbolField, TextAreaField } from '../src/index.ts';
import { ListFilter } from '../src/list-filter/ListFilter.tsx';
import { seriousViolations } from './axe.ts';

const SYMBOLS = [
  { symbol: 'NABIL', name: 'Nabil Bank' },
  { symbol: 'NABBC', name: 'Narayani Development Bank' },
  { symbol: 'ADBL', name: 'Agricultural Development Bank' },
];

function TextHarness() {
  const [v, setV] = useState('');
  return <Field label="Name" hint="As on your card" value={v} onChange={setV} testId="name" />;
}

function SymbolHarness() {
  const [v, setV] = useState('');
  return <SymbolField label="Symbol" value={v} onChange={setV} options={SYMBOLS} testId="sym" />;
}

function FilterHarness() {
  const [v, setV] = useState('');
  return <ListFilter value={v} onChange={setV} label="Filter holdings" clear="Clear filter" testId="lf" slash />;
}

function CsHarness({ onOpen }: { onOpen: (s: string) => void }) {
  return <CompanySearch options={SYMBOLS} label="Find a company" placeholder="Symbol or name" onOpen={onOpen} none={(q) => `No company matches “${q}”.`} testId="cs" optionTestId="cs-opt" />;
}

describe('Field family', () => {
  it('a label over the input, the hint describes it, typing calls onChange', async () => {
    render(<TextHarness />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByText('As on your card').id);
    await userEvent.type(input, 'Sita');
    expect((input as HTMLInputElement).value).toBe('Sita');
  });

  it('an error replaces the hint, is announced and marks the field invalid', () => {
    render(<Field label="Amount" hint="Rupees" error="Enter an amount" value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Enter an amount');
    expect(screen.queryByText('Rupees')).toBeNull();
  });

  it('NumberField, DateField, TextAreaField and SelectField set the right control', () => {
    render(
      <>
        <NumberField label="Units" integer value="" onChange={() => {}} />
        <NumberField label="Price" value="" onChange={() => {}} />
        <DateField label="On" value="" onChange={() => {}} />
        <TextAreaField label="Note" value="" onChange={() => {}} />
        <SelectField label="Kind" value="a" onChange={() => {}} options={[{ value: 'a', label: 'A' }]} size="md" hideLabel />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Units' }).getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByRole('textbox', { name: 'Price' }).getAttribute('inputmode')).toBe('decimal');
    expect(screen.getByLabelText('On').getAttribute('type')).toBe('date');
    expect(screen.getByRole('textbox', { name: 'Note' }).tagName).toBe('TEXTAREA');
    expect(screen.getByRole('combobox', { name: 'Kind' })).toBeTruthy();
  });

  it('SymbolField is a combobox: suggestions, arrows and Enter pick one', async () => {
    render(<SymbolHarness />);
    const input = screen.getByRole('combobox', { name: 'Symbol' });
    await userEvent.type(input, 'nab');
    expect((input as HTMLInputElement).value).toBe('NAB');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['NABBCNarayani Development Bank', 'NABILNabil Bank']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect((input as HTMLInputElement).value).toBe('NABIL');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.hasAttribute('aria-controls')).toBe(false);
  });

  it('connects SymbolField help and errors and selects suggestions with a pointer', async () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<SymbolField label="Stock" hint="Listed symbol" error="Choose a valid symbol" value="NA" onChange={onChange} options={SYMBOLS} />);
    const input = screen.getByRole('combobox', { name: 'Stock' });
    await userEvent.click(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
    expect(input.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
    await userEvent.click(screen.getByRole('option', { name: /NABIL.*Nabil Bank/ }));
    expect(onChange).toHaveBeenCalledWith('NABIL');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes SymbolField suggestions on blur and prevents stale active descendants', async () => {
    const options = [...SYMBOLS, { symbol: 'NAR', name: 'Nara Bank' }, { symbol: 'NAS', name: 'Nasa Finance' }];
    const { rerender } = render(<SymbolField label="Stock" value="NA" onChange={() => {}} options={options} />);
    const input = screen.getByRole('combobox', { name: 'Stock' });
    input.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(document.getElementById(input.getAttribute('aria-activedescendant') ?? '')).not.toBeNull();
    rerender(<SymbolField label="Stock" value="NA" onChange={() => {}} options={[SYMBOLS[0]!]} />);
    expect(document.getElementById(input.getAttribute('aria-activedescendant') ?? '')).not.toBeNull();
    await userEvent.tab();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <form>
        <TextHarness />
        <Field label="Bad" error="Wrong" value="x" onChange={() => {}} />
        <SymbolHarness />
      </form>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('ListFilter', () => {
  it('filters, clears with the × button and with Esc, and / focuses it', async () => {
    render(<FilterHarness />);
    const input = screen.getByRole('searchbox', { name: 'Filter holdings' });
    await userEvent.type(input, 'nab');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect((input as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(input);
    await userEvent.type(input, 'x{Escape}');
    expect((input as HTMLInputElement).value).toBe('');
    input.blur();
    await userEvent.keyboard('/');
    expect(document.activeElement).toBe(input);
  });

  it('has no serious axe violations, label hidden or above', async () => {
    const { container } = render(
      <>
        <FilterHarness />
        <ListFilter value="" onChange={() => {}} label="Search" clear="Clear" testId="b" size="lg" labelPlacement="above" />
      </>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('CompanySearch', () => {
  it('exposes the listbox relationship only while the combobox popup exists', async () => {
    render(<CsHarness onOpen={() => {}} />);
    const input = screen.getByRole('combobox', { name: 'Find a company' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-controls')).toBe(false);
    await userEvent.type(input, 'nab');
    const list = screen.getByRole('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    await userEvent.keyboard('{Escape}');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-controls')).toBe(false);
  });

  it('suggests as you type, arrows wrap, Enter opens the chosen one', async () => {
    const opened: string[] = [];
    render(<CsHarness onOpen={(s) => opened.push(s)} />);
    const input = screen.getByRole('combobox', { name: 'Find a company' });
    await userEvent.type(input, 'bank');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(opened).toEqual(['NABIL']);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-controls')).toBe(false);
  });

  it('closes suggestions after a pointer selection', async () => {
    const opened: string[] = [];
    render(<CsHarness onOpen={(s) => opened.push(s)} />);
    const input = screen.getByRole('combobox', { name: 'Find a company' });
    await userEvent.type(input, 'nab');
    await userEvent.click(screen.getByRole('option', { name: /NABIL/ }));
    expect(opened).toEqual(['NABIL']);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-controls')).toBe(false);
  });

  it('says when nothing matches; Esc clears, then leaves', async () => {
    render(<CsHarness onOpen={() => {}} />);
    const input = screen.getByRole('combobox', { name: 'Find a company' });
    await userEvent.type(input, 'zzz');
    expect(screen.getByRole('status').textContent).toBe('No company matches “zzz”.');
    await userEvent.keyboard('{Escape}');
    expect((input as HTMLInputElement).value).toBe('');
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).not.toBe(input);
  });

  it('has no serious axe violations with suggestions open', async () => {
    const { container } = render(<CsHarness onOpen={() => {}} />);
    await userEvent.type(screen.getByRole('combobox'), 'nab');
    expect(await seriousViolations(container)).toEqual([]);
  });
});
