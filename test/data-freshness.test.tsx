import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataFreshness, PunjiLocaleProvider } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});

const T0 = Date.parse('2026-11-07T04:00:00Z');
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('DataFreshness', () => {
  it('shows each state as words and an icon, never colour alone', () => {
    const expected = { live: 'Live', delayed: 'Delayed 15 min', 'end-of-day': 'End of day', stale: 'Stale', offline: 'Offline' } as const;
    for (const state of Object.keys(expected) as (keyof typeof expected)[]) {
      const { unmount } = render(<DataFreshness state={state} delayMinutes={15} testId="f" />);
      const root = screen.getByTestId('f');
      expect(root.textContent).toContain(expected[state]);
      expect(root.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(root.dataset.state).toBe(state);
      unmount();
    }
  });

  it('shows the relative age and ticks it on a slow timer', () => {
    vi.useFakeTimers();
    let clock = T0 + 30_000;
    render(<DataFreshness state="live" asOf={new Date(T0)} now={() => clock} testId="f" />);
    expect(screen.getByTestId('f').textContent).toContain('Updated now');
    clock = T0 + 5 * 60_000;
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('f').textContent).toContain('Updated 5 min. ago');
    expect(screen.getByTestId('f').querySelector('time')?.getAttribute('datetime')).toBe('2026-11-07T04:00:00.000Z');
  });

  it('pauses the timer while the document is hidden and catches up when visible', () => {
    vi.useFakeTimers();
    let clock = T0;
    render(<DataFreshness state="live" asOf={T0} now={() => clock} testId="f" />);
    act(() => setHidden(true));
    clock = T0 + 10 * 60_000;
    act(() => { vi.advanceTimersByTime(5 * 60_000); });
    expect(screen.getByTestId('f').textContent).toContain('Updated now');
    act(() => setHidden(false));
    expect(screen.getByTestId('f').textContent).toContain('Updated 10 min. ago');
  });

  it('stops its timer on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<DataFreshness state="live" asOf={T0} now={() => T0} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('announces through role=status only when the state changes, not on mount or on a tick', () => {
    vi.useFakeTimers();
    let clock = T0;
    const { rerender } = render(<DataFreshness state="live" asOf={T0} now={() => clock} testId="f" />);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    clock = T0 + 120_000;
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(region.textContent).toBe('');
    expect(screen.getByTestId('f').textContent).toContain('Updated 2 min. ago');
    rerender(<DataFreshness state="delayed" delayMinutes={20} asOf={T0} now={() => clock} testId="f" />);
    expect(screen.getByRole('status').textContent).toBe('Data status: Delayed 20 min');
  });

  it('takes its words from the locale provider and from labels', () => {
    render(
      <PunjiLocaleProvider messages={{ dataFreshness: { live: 'Sidha', updated: (a) => `Naya ${a}` } }}>
        <DataFreshness state="live" asOf={T0} now={() => T0} labels={{ live: 'Live now' }} testId="f" />
      </PunjiLocaleProvider>,
    );
    expect(screen.getByTestId('f').textContent).toContain('Live now');
    expect(screen.getByTestId('f').textContent).toContain('Naya');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<DataFreshness state="stale" asOf={T0} now={() => T0} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
