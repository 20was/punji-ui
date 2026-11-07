import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BarList, type BarListItem } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const share = (el: Element) => (el.querySelector('.pu-bar-list-fill') as HTMLElement).style.getPropertyValue('--bar-list-share');

const ITEMS: BarListItem[] = [
  { id: 'a', label: 'Banking', value: 400n, valueText: 'Rs 4.00' },
  { id: 'b', label: 'Hydropower', value: 100n, valueText: 'Rs 1.00' },
  { id: 'c', label: 'Hotels', value: null, valueText: 'No data' },
];

describe('BarList', () => {
  it('is a named ordered list in the caller’s order, with every label and exact value printed', () => {
    render(<BarList items={ITEMS} label="Sectors" empty="None" />);
    const rows = screen.getByRole('list', { name: 'Sectors' }).querySelectorAll('li');
    expect([...rows].map((r) => r.textContent)).toEqual(['BankingRs 4.00', 'HydropowerRs 1.00', 'HotelsNo data']);
  });
  it('sizes bars against the largest value, and draws none for a missing one', () => {
    render(<BarList items={ITEMS} label="Sectors" empty="None" />);
    const rows = screen.getAllByRole('listitem');
    expect(share(rows[0]!)).toBe('100%');
    expect(share(rows[1]!)).toBe('25%');
    expect(rows[2]!.querySelector('.pu-bar-list-track')).toBeNull();
  });
  it('uses a shared maximum when given', () => {
    render(<BarList items={ITEMS} max={800n} label="Sectors" empty="None" />);
    expect(share(screen.getAllByRole('listitem')[0]!)).toBe('50%');
  });
  it('keeps the share exact for bigint amounts past 2^53', () => {
    const top = 9_007_199_254_740_993n; // 2^53 + 1
    render(<BarList items={[{ id: 'a', label: 'A', value: top, valueText: 'x' }, { id: 'b', label: 'B', value: top / 2n, valueText: 'y' }, { id: 'c', label: 'C', value: top - 1n, valueText: 'z' }]} label="Big" empty="None" />);
    const rows = screen.getAllByRole('listitem');
    expect(share(rows[0]!)).toBe('100%');
    expect(share(rows[1]!)).toBe('49.9999%');
    // One paisa under the top is not 100% (a Number could not tell them apart).
    expect(share(rows[2]!)).toBe('99.9999%');
  });
  it('omits the bar for a negative or non-finite value and still prints its figure', () => {
    render(<BarList items={[{ id: 'n', label: 'N', value: -5, valueText: '-5' }, { id: 'x', label: 'X', value: Number.NaN, valueText: 'n/a' }, { id: 'g', label: 'G', value: -1n, valueText: '-1' }]} label="L" empty="None" />);
    expect(document.querySelectorAll('.pu-bar-list-track')).toHaveLength(0);
    expect(screen.getByText('n/a')).toBeTruthy();
  });
  it('rows are static text unless onItemClick is given, then native buttons that honour disabled', () => {
    const onItemClick = vi.fn<() => void>();
    const { rerender } = render(<BarList items={ITEMS} label="Sectors" empty="None" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    rerender(<BarList items={[{ ...ITEMS[0]! }, { ...ITEMS[1]!, disabled: true }]} label="Sectors" empty="None" onItemClick={onItemClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Banking/ }));
    expect(onItemClick).toHaveBeenCalledWith('a');
    expect((screen.getByRole('button', { name: /Hydropower/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('shows the empty content, and three placeholders while loading', () => {
    const { rerender } = render(<BarList items={[]} label="Sectors" empty="No sectors yet" />);
    expect(screen.getByText('No sectors yet')).toBeTruthy();
    rerender(<BarList items={ITEMS} loading label="Sectors" empty="None" />);
    expect(screen.getByRole('list').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('list').querySelectorAll('li')).toHaveLength(3);
    expect(screen.queryByText('Banking')).toBeNull();
  });
  it('can carry a heading, a tone, a test id, and the ol’s own attributes', () => {
    render(<BarList items={ITEMS} label="Sectors" empty="None" heading="By sector" tone="info" testId="bl" id="x" />);
    expect(screen.getByRole('heading', { name: 'By sector' })).toBeTruthy();
    expect(screen.getByTestId('bl').getAttribute('data-tone')).toBe('info');
    expect(screen.getByTestId('bl').id).toBe('x');
    expect(screen.getByTestId('bl-row-a')).toBeTruthy();
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<BarList items={ITEMS} label="Sectors" empty="None" heading="By sector" onItemClick={() => {}} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
