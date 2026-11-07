import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteAnnouncer } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

beforeEach(() => {
  vi.useFakeTimers();
  document.title = 'Markets';
});
afterEach(() => vi.useRealTimers());

const Shell = ({ route }: { route: string }) => (
  <>
    <RouteAnnouncer routeKey={route} testId="ra" />
    <main id="main">content</main>
  </>
);

describe('RouteAnnouncer with routeKey', () => {
  it('announces nothing on the first render and does not steal focus', () => {
    render(<Shell route="/markets" />);
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByTestId('ra').textContent).toBe('');
    expect(document.activeElement).toBe(document.body);
  });

  it('on a route change moves focus to main and announces the title after the delay', () => {
    const { rerender } = render(<Shell route="/markets" />);
    document.title = 'Portfolio';
    rerender(<Shell route="/portfolio" />);
    expect(document.activeElement).toBe(document.getElementById('main'));
    expect(screen.getByTestId('ra').textContent).toBe('');
    act(() => void vi.advanceTimersByTime(130));
    expect(screen.getByTestId('ra').textContent).toBe('Portfolio');
  });

  it('falls back to the route when the page has no title, and takes a focus id', () => {
    document.title = '';
    const { rerender } = render(
      <>
        <RouteAnnouncer routeKey="/a" focusId="body" testId="ra" />
        <div id="body" />
      </>,
    );
    rerender(
      <>
        <RouteAnnouncer routeKey="/b" focusId="body" testId="ra" />
        <div id="body" />
      </>,
    );
    expect(document.activeElement).toBe(document.getElementById('body'));
    act(() => void vi.advanceTimersByTime(130));
    expect(screen.getByTestId('ra').textContent).toBe('/b');
  });

  it('a quick second navigation announces only the last page', () => {
    const { rerender } = render(<Shell route="/a" />);
    document.title = 'B';
    rerender(<Shell route="/b" />);
    document.title = 'C';
    rerender(<Shell route="/c" />);
    act(() => void vi.advanceTimersByTime(130));
    expect(screen.getByTestId('ra').textContent).toBe('C');
  });
});

describe('RouteAnnouncer without routeKey', () => {
  it('announces a changed document title and leaves focus alone', async () => {
    render(<><RouteAnnouncer testId="ra" /><main id="main" /></>);
    await act(async () => {
      document.title = 'Stock: NABIL';
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(screen.getByTestId('ra').textContent).toBe('Stock: NABIL');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('RouteAnnouncer markup', () => {
  it('is a polite, atomic live region, hidden visually', () => {
    render(<RouteAnnouncer testId="ra" />);
    const el = screen.getByTestId('ra');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-atomic')).toBe('true');
    expect(el.className).toBe('pu-route-announcer');
  });

  it('renders on the server', () => {
    expect(renderToString(<RouteAnnouncer routeKey="/x" />)).toContain('aria-live="polite"');
  });

  it('has no serious axe violations', async () => {
    vi.useRealTimers();
    const { container } = render(<Shell route="/x" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
