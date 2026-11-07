import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AlertBar, AlertGlyph, AlertListEmpty, AlertRow, AlertRowCompact, AlertRowList, AlertRowSkeleton, alertDistance, alertTarget, type AlertRowProps } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const base: AlertRowProps = {
  symbol: 'HRL',
  name: 'Himalayan Reinsurance',
  mark: 'above',
  status: 'waiting',
  condition: 'Above Rs 500',
  repeat: 'Once',
  price: 'Rs 493.80',
  distance: '1.26% to go',
  closeness: 0.874,
  onOpen: () => {},
};

const fill = (closeness: number) => {
  const { container, unmount } = render(<AlertBar closeness={closeness} />);
  const width = (container.querySelector('i') as HTMLElement).style.width;
  unmount();
  return width;
};

describe('AlertRow', () => {
  it('is one button that names the symbol and company, described by the condition, price and distance', () => {
    render(<AlertRowList label="Alerts"><AlertRow {...base} testId="r" openTestId="o" /></AlertRowList>);
    const open = screen.getByTestId('o');
    expect(open.tagName).toBe('BUTTON');
    expect(open.textContent).toContain('HRL');
    expect(open.textContent).toContain('Himalayan Reinsurance');
    const described = open.getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)!.textContent);
    expect(described).toEqual(['Above Rs 500Once', 'Rs 493.80', '1.26% to go']);
  });
  it('opens the alert on click, marks the selected row, and carries the key for page shortcuts', () => {
    const onOpen = vi.fn<() => void>();
    render(<AlertRowList label="Alerts"><AlertRow {...base} onOpen={onOpen} selected rowKey="hrl" openTestId="o" /></AlertRowList>);
    fireEvent.click(screen.getByTestId('o'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('o').getAttribute('aria-current')).toBe('true');
    expect(screen.getByTestId('o').getAttribute('data-desk-row')).toBe('hrl');
  });
  it('shows the state in words as well as tint: every status prints its own distance words', () => {
    const { rerender } = render(<AlertRowList label="Alerts"><AlertRow {...base} status="crossed" distance="Past the target · fires on the next check" closeness={1} testId="r" /></AlertRowList>);
    expect(screen.getByTestId('r').getAttribute('data-status')).toBe('crossed');
    expect(screen.getAllByText('Past the target · fires on the next check').length).toBeGreaterThan(0);
    rerender(<AlertRowList label="Alerts"><AlertRow {...base} status="fired" distance="Reached Fri 16 Oct, 13:42" closeness={null} testId="r" /></AlertRowList>);
    expect(screen.getByTestId('r').querySelector('.pu-alert-bar')).toBeNull();
  });
  it('draws the bar from closeness and none without one', () => {
    const { container, rerender } = render(<AlertRowList label="Alerts"><AlertRow {...base} closeness={0.5} /></AlertRowList>);
    expect((container.querySelector('.pu-alert-bar i') as HTMLElement).style.width).toBe('50%');
    rerender(<AlertRowList label="Alerts"><AlertRow {...base} closeness={undefined} /></AlertRowList>);
    expect(container.querySelector('.pu-alert-bar')).toBeNull();
  });
  it('gets its figures from the exact helpers (bigint prices past 2^53)', () => {
    const price = 9_007_199_254_740_993n;
    const target = price + 100n;
    const d = alertDistance('above', target, price)!;
    render(<AlertRowList label="Alerts"><AlertRow {...base} condition={`Above ${alertTarget(target)}`} distance={d.crossed ? 'Past' : `${d.pct.toFixed(2)}% to go`} closeness={d.closeness} testId="r" /></AlertRowList>);
    expect(d.diff).toBe(100n);
    expect(screen.getAllByText(/Above Rs 9,00,71,99,25,47,410\.93/)[0]).toBeTruthy();
  });
  it('lists a head, a row menu that stays, and the badge', () => {
    render(<AlertRowList label="Alerts" head={['Alert', 'When', 'Price', 'Distance']}><AlertRow {...base} badge="Index" actions={<button type="button">Pause</button>} more={<button type="button">More</button>} testId="r" /></AlertRowList>);
    expect(screen.getAllByText('Distance')[0]).toBeTruthy();
    expect(screen.getAllByText('Index').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More' }).closest('[data-menu]')).toBeTruthy();
    expect(screen.getByTestId('r').hasAttribute('data-more')).toBe(true);
  });
  it('the list says it is busy while loading, with skeleton rows hidden from assistive technology', () => {
    const { container } = render(<AlertRowList label="Alerts" busy><AlertRowSkeleton index={0} /><AlertRowSkeleton index={1} /></AlertRowList>);
    expect(screen.getByRole('list', { name: 'Alerts' }).getAttribute('aria-busy')).toBe('true');
    expect([...container.querySelectorAll('li')].every((li) => li.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
  it('has no serious axe violations', async () => {
    const { container } = render(
      <>
        <AlertRowList label="Alerts" head={['Alert', 'When', 'Price', 'Distance']}>
          <AlertRow {...base} />
          <AlertRow {...base} symbol="NABIL" mark="below" status="paused" />
          <AlertRowSkeleton />
        </AlertRowList>
        <AlertListEmpty title="No alerts" body="Set one from a stock page." role="status" />
      </>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('AlertRowCompact', () => {
  it('is a link with href, a button with onOpen, and plain text otherwise', () => {
    const onOpen = vi.fn<() => void>();
    const { rerender } = render(<AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" href="/alerts/1" testId="c" />);
    expect(screen.getByTestId('c').tagName).toBe('A');
    expect(screen.getByTestId('c').getAttribute('href')).toBe('/alerts/1');
    rerender(<AlertRowCompact title="HRL" status="waiting" onOpen={onOpen} testId="c" />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    rerender(<AlertRowCompact title="HRL" status="waiting" testId="c" />);
    expect(screen.getByTestId('c').tagName).toBe('DIV');
  });
  it('uses the router adapter for an in-app path', () => {
    render(<AlertRowCompact title="HRL" status="waiting" href="/alerts/1" linkComponent={({ href, children, ...rest }) => <a data-routed="" href={href} {...rest}>{children}</a>} testId="c" />);
    expect(screen.getByTestId('c').hasAttribute('data-routed')).toBe(true);
  });
  it('shows the aside, the second line and the bar, and an aside of zero is still shown', () => {
    const { container } = render(<AlertRowCompact title="HRL" aside={0} sub="Now 493.80" status="crossed" closeness={1} stack />);
    expect(container.querySelector('.pu-alert-mini-aside')?.textContent).toBe('0');
    expect(screen.getByText('Now 493.80')).toBeTruthy();
    expect(container.querySelector('.pu-alert-bar i')?.getAttribute('style')).toContain('100%');
  });
});

describe('AlertGlyph, AlertBar and AlertListEmpty', () => {
  it('the glyph is decorative and differs by mark (an arrow up, an arrow down, a wave)', () => {
    const paths = (['above', 'below', 'indicator'] as const).map((mark) => {
      const { container, unmount } = render(<AlertGlyph mark={mark} />);
      expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
      const d = container.querySelector('path')!.getAttribute('d');
      unmount();
      return d;
    });
    expect(new Set(paths).size).toBe(3);
  });
  it('the bar clamps its fill and ignores a non-finite one', () => {
    expect([fill(2), fill(-1), fill(Number.NaN), fill(0.333)]).toEqual(['100%', '0%', '0%', '33.3%']);
  });
  it('the empty state names the reason and holds the next step', () => {
    render(<AlertListEmpty title="No fired alerts" body="Nothing has fired yet." action={<button type="button">Set an alert</button>} headingLevel={3} role="status" testId="e" />);
    expect(screen.getByRole('heading', { level: 3, name: 'No fired alerts' })).toBeTruthy();
    expect(screen.getByRole('status')).toBe(screen.getByTestId('e'));
    expect(screen.getByRole('button', { name: 'Set an alert' })).toBeTruthy();
  });
});
