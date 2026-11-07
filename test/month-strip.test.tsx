import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MonthStrip, type MonthCell } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const CELLS: MonthCell[] = [
  { key: '2026-06', label: 'Jun', text: '+1.64%', tone: 'gain', aria: 'Jun 2026: +1.64%' },
  { key: '2026-07', label: 'Jul', text: '-0.80%', tone: 'loss', aria: 'Jul 2026: -0.80%' },
  { key: '2026-08', label: 'Aug', text: '0.00%', tone: 'flat', aria: 'Aug 2026: 0.00%, held in cash' },
];

describe('MonthStrip', () => {
  it('is a named list with one cell per month, each read whole', () => {
    render(<MonthStrip cells={CELLS} label="Months" testId="m" />);
    const items = screen.getByRole('list', { name: 'Months' }).querySelectorAll('li');
    expect([...items].map((li) => li.getAttribute('aria-label'))).toEqual(['Jun 2026: +1.64%', 'Jul 2026: -0.80%', 'Aug 2026: 0.00%, held in cash']);
  });
  it('tints by direction but the figure carries its sign: colour is never the only signal', () => {
    render(<MonthStrip cells={CELLS} label="Months" />);
    const [gain, loss, flat] = screen.getAllByRole('listitem');
    expect(gain!.getAttribute('data-tone')).toBe('gain');
    expect(gain!.textContent).toContain('+1.64%');
    expect(loss!.getAttribute('data-tone')).toBe('loss');
    expect(loss!.textContent).toContain('-0.80%');
    expect(flat!.hasAttribute('data-tone')).toBe(false);
  });
  it('still accepts the web kit’s up and down tones', () => {
    render(<MonthStrip label="Months" cells={[{ ...CELLS[0]!, tone: 'up' }, { ...CELLS[1]!, tone: 'down' }]} />);
    expect(screen.getAllByRole('listitem').map((li) => li.getAttribute('data-tone'))).toEqual(['gain', 'loss']);
  });
  it('draws the lines over and under the strip when given', () => {
    render(<MonthStrip cells={CELLS} label="Months" head="1 of 3 months rose" foot="Best: Jun" />);
    expect(screen.getByText('1 of 3 months rose')).toBeTruthy();
    expect(screen.getByText('Best: Jun')).toBeTruthy();
  });
  it('an empty strip is an empty named list', () => {
    render(<MonthStrip cells={[]} label="Months" />);
    expect(screen.getByRole('list', { name: 'Months' }).children).toHaveLength(0);
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<MonthStrip cells={CELLS} label="Months" head="1 of 3 months rose" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
