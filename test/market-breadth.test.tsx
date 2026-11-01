import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { MarketBreadth, advanceDeclineRatio, breadthOf } from '../src/index.ts';
import { seriousViolations } from './axe.ts';
import { NUM_RUNS } from './fc.ts';
import { QUOTES } from './market-fixtures.ts';

describe('breadthOf', () => {
  it('counts advances, declines and unchanged; a missing price is unchanged', () => {
    expect(
      breadthOf([
        { ltp: 110n, previousClose: 100n },
        { ltp: 90n, previousClose: 100n },
        { ltp: 100n, previousClose: 100n },
        { ltp: null, previousClose: 100n },
        { ltp: 100n, previousClose: null },
      ]),
    ).toEqual({ advances: 1, declines: 1, unchanged: 3 });
    expect(breadthOf([])).toEqual({ advances: 0, declines: 0, unchanged: 0 });
  });

  it('always accounts for every quote', () => {
    fc.assert(
      fc.property(fc.array(fc.record({ ltp: fc.option(fc.bigInt({ min: 0n, max: 10_000n })), previousClose: fc.option(fc.bigInt({ min: 0n, max: 10_000n })) })), (quotes) => {
        const b = breadthOf(quotes);
        expect(b.advances + b.declines + b.unchanged).toBe(quotes.length);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('gives the A/D ratio, or null with no declines', () => {
    expect(advanceDeclineRatio({ advances: 30, declines: 20 })).toBe(1.5);
    expect(advanceDeclineRatio({ advances: 3, declines: 0 })).toBeNull();
  });
});

describe('MarketBreadth', () => {
  it('prints counts, shares and the ratio, and speaks the bar in one line', () => {
    render(<MarketBreadth label="NEPSE breadth" advances={45} declines={30} unchanged={5} testId="mb" />);
    expect(screen.getByRole('img', { name: '45 advances, 30 declines, 5 unchanged of 80' })).toBeTruthy();
    const fig = screen.getByTestId('mb');
    expect(fig.textContent).toContain('Advances');
    expect(fig.textContent).toContain('45 (56%)');
    expect(fig.textContent).toContain('30 (38%)');
    expect(fig.textContent).toContain('1.50');
  });

  it('counts from quotes, says "No declines", lists extras and hides the ratio on request', () => {
    const b = breadthOf(QUOTES);
    const { rerender } = render(<MarketBreadth label="b" {...b} extra={[{ id: 'u', label: 'At upper circuit', value: 2, tone: 'up' }, { id: 'h', label: '52-week highs', value: null }]} />);
    expect(screen.getByText('At upper circuit')).toBeTruthy();
    expect(screen.getByText('Not known')).toBeTruthy();
    rerender(<MarketBreadth label="b" advances={4} declines={0} unchanged={0} />);
    expect(screen.getByText('No declines')).toBeTruthy();
    rerender(<MarketBreadth label="b" advances={4} declines={1} unchanged={0} showRatio={false} />);
    expect(screen.queryByText('A/D ratio')).toBeNull();
  });

  it('has empty and loading states, and ignores negative or non-finite counts', () => {
    const { rerender } = render(<MarketBreadth label="b" advances={0} declines={0} unchanged={0} />);
    expect(screen.getByRole('status').textContent).toBe('No stocks have traded yet.');
    rerender(<MarketBreadth label="b" loading />);
    expect(screen.getByRole('status', { name: 'Loading market breadth' })).toBeTruthy();
    rerender(<MarketBreadth label="b" advances={-3} declines={Number.NaN} unchanged={2} labels={{ unchanged: 'Flat' }} convention="red-up" testId="mb" />);
    expect(screen.getByRole('img', { name: '0 advances, 0 declines, 2 unchanged of 2' })).toBeTruthy();
    expect(screen.getByText('Flat')).toBeTruthy();
    expect(screen.getByTestId('mb').getAttribute('data-convention')).toBe('red-up');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<MarketBreadth label="NEPSE breadth" advances={45} declines={30} unchanged={5} extra={[{ id: 'u', label: 'At upper circuit', value: 2 }]} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
