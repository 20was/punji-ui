import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InstrumentHeader } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const BIG = 9_007_199_254_740_993n; // 2^53 + 1 paisa

describe('InstrumentHeader', () => {
  it('shows the symbol as a heading over its name and group, with the price and its exact change', () => {
    render(<InstrumentHeader testId="h" symbol="NABIL" name="Nabil Bank Limited" group="Commercial Banks" currency="NPR" price={51230n} previousClose={50800n} />);
    expect(screen.getByRole('heading', { level: 2, name: 'NABIL' })).toBeTruthy();
    expect(screen.getByText('Nabil Bank Limited · Commercial Banks')).toBeTruthy();
    expect(screen.getByTestId('h-price').textContent).toContain('512.30');
    const change = screen.getByTestId('h-change');
    expect(change.textContent).toContain('+4.30');
    expect(change.textContent).toContain('(+0.85%)');
    expect(change.textContent).toContain('up'); // a spoken word, never colour alone
    expect(change.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('says down with a minus sign and the word', () => {
    render(<InstrumentHeader testId="h" symbol="NABIL" currency="NPR" price={50000n} previousClose={50800n} />);
    const change = screen.getByTestId('h-change');
    expect(change.textContent).toContain('down');
    expect(change.textContent).toMatch(/[-−]8\.00/);
  });
  it('keeps price and change exact past 2^53', () => {
    render(<InstrumentHeader testId="h" symbol="BIG" currency="NPR" price={BIG} previousClose={BIG - 1n} />);
    expect(screen.getByTestId('h-price').textContent!.replace(/,/g, '')).toContain('90071992547409.93');
    expect(screen.getByTestId('h-change').textContent).toContain('+0.01');
  });
  it('takes a published change instead of a previous close', () => {
    render(<InstrumentHeader testId="h" symbol="NABIL" currency="NPR" price={51230n} change={{ absolute: -100n, percent: -0.19 }} />);
    expect(screen.getByTestId('h-change').textContent).toContain('down');
  });
  it('shows a note in the change’s place when the figure is not live', () => {
    render(<InstrumentHeader testId="h" symbol="NABIL" currency="NPR" price={51230n} previousClose={50800n} note="Last close · 16 Oct" />);
    expect(screen.getByTestId('h-note').textContent).toBe('Last close · 16 Oct');
    expect(screen.queryByTestId('h-change')).toBeNull();
  });
  it('draws an index as a published figure and move, with the direction in words', () => {
    render(<InstrumentHeader testId="h" symbol="NEPSE" tag="Index" figure="2,641.18" figureChange={{ text: '+12.40 · +0.47%', direction: 'up' }} />);
    expect(screen.getByTestId('h-price').textContent).toBe('2,641.18');
    expect(screen.getByTestId('h-change').textContent).toBe('+12.40 · +0.47% up');
    expect(screen.getByText('Index')).toBeTruthy();
  });
  it('holds the figures’ place while loading and never prints a dash or a zero for an unknown price', () => {
    const { container, rerender } = render(<InstrumentHeader testId="h" symbol="NABIL" currency="NPR" price={null} loading />);
    expect(screen.getByTestId('h').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.kit-skel')).toBeTruthy();
    rerender(<InstrumentHeader testId="h" symbol="NABIL" currency="NPR" price={null} />);
    expect(container.querySelector('.pu-instrument-header-figures')).toBeNull();
    expect(container.textContent).not.toMatch(/[—-]|\b0\b/);
  });
  it('sets the heading level and id, shows actions and the spoken words', () => {
    render(<InstrumentHeader testId="h" symbol="NABIL" headingLevel={1} headingId="t" currency="NPR" price={100n} previousClose={90n} changeLabels={{ up: 'माथि', down: 'तल', flat: 'अपरिवर्तित' }} actions={<button type="button">Watch</button>} />);
    expect(screen.getByRole('heading', { level: 1 }).id).toBe('t');
    expect(screen.getByRole('button', { name: 'Watch' })).toBeTruthy();
    expect(screen.getByTestId('h-change').textContent).toContain('माथि');
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<InstrumentHeader symbol="NABIL" name="Nabil Bank Limited" glyph={<svg />} currency="NPR" price={51230n} previousClose={50800n} actions={<button type="button">Watch</button>} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
