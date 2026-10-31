import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { FloatingTooltip, IconHint } from '../src/floating-tooltip/FloatingTooltip.tsx';
import { EmptyState, Note, RangeSlider, Skeleton, SkeletonText, ToneIcon } from '../src/index.ts';
import { InfoTip, Tooltip } from '../src/info-tip/InfoTip.tsx';
import { seriousViolations } from './axe.ts';

beforeAll(() => {
  // jsdom has no ResizeObserver; the tooltip only needs it to exist.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function RangeHarness() {
  const [r, setR] = useState<[number, number]>([2, 8]);
  return <RangeSlider min={0} max={10} step={1} lo={r[0]} hi={r[1]} onChange={(lo, hi) => setR([lo, hi])} labelLo="Yield minimum" labelHi="Yield maximum" valueText={(v) => `${v}%`} testId="yield" />;
}

describe('EmptyState, Note, Skeleton, ToneIcon', () => {
  it('an empty state has a heading, a line and one action; an error state is an alert', () => {
    render(<EmptyState title="Nothing yet" body="Add a holding to see it here." action={<button type="button">Add</button>} role="alert" />);
    expect(screen.getByRole('alert').querySelector('h2')?.textContent).toBe('Nothing yet');
  });

  it('a note carries its tone as an icon, never colour alone', () => {
    const html = renderToStaticMarkup(<Note tone="warn">Prices are from yesterday.</Note>);
    expect(html).toContain('class="kit-note warn"');
    expect(html).toContain('class="kit-tone-ico warn"');
    expect(renderToStaticMarkup(<Note>Plain</Note>)).toBe('<p class="kit-note">Plain</p>');
    expect(renderToStaticMarkup(<ToneIcon tone="success" />)).toContain('aria-hidden="true"');
  });

  it('a skeleton is hidden, unless it names the loading region', () => {
    expect(renderToStaticMarkup(<Skeleton />)).toContain('aria-hidden="true"');
    render(<SkeletonText lines={3} label="Loading holdings" />);
    const status = screen.getByRole('status', { name: 'Loading holdings' });
    expect(status.querySelectorAll('.kit-skel')).toHaveLength(3);
    expect((status.lastElementChild as HTMLElement).style.width).toBe('60%');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <div>
        <EmptyState title="Nothing yet" body="Line" />
        <Note tone="error">Could not load.</Note>
        <Skeleton label="Loading" circle width={40} height={40} />
      </div>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('RangeSlider', () => {
  it('two named thumbs that say their value; a thumb never passes the other', () => {
    render(<RangeHarness />);
    const lo = screen.getByRole('slider', { name: 'Yield minimum' }) as HTMLInputElement;
    const hi = screen.getByRole('slider', { name: 'Yield maximum' }) as HTMLInputElement;
    expect(lo.getAttribute('aria-valuetext')).toBe('2%');
    fireEvent.change(lo, { target: { value: '9' } });
    expect(lo.value).toBe('8');
    fireEvent.change(hi, { target: { value: '1' } });
    expect(hi.value).toBe('8');
    fireEvent.change(hi, { target: { value: '10' } });
    expect(hi.getAttribute('aria-valuetext')).toBe('10%');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<RangeHarness />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('InfoTip and Tooltip', () => {
  it('InfoTip opens on focus and on click, describes its button while open, closes on Esc', async () => {
    render(
      <p>
        Yield<InfoTip label="What yield means">Cash paid over a year, as a share of the price.</InfoTip>
      </p>,
    );
    const btn = screen.getByRole('button', { name: 'What yield means' });
    await userEvent.tab();
    expect(document.activeElement).toBe(btn);
    expect(screen.getByRole('tooltip').textContent).toContain('Cash paid');
    expect(btn.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    await userEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('Tooltip shows on keyboard focus and, with describe, describes its control', async () => {
    render(
      <Tooltip content="Settings" describe>
        <button type="button" aria-label="Open settings">
          ⚙
        </button>
      </Tooltip>,
    );
    await userEvent.tab();
    const tip = await screen.findByRole('tooltip');
    expect(tip.textContent).toBe('Settings');
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toBe(tip.id);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('FloatingTooltip stays inside the window; IconHint shows on focus', async () => {
    render(
      <>
        <FloatingTooltip anchor={{ x: 5000, y: 5000 }} testId="ft">
          Readout
        </FloatingTooltip>
        <IconHint label="Compare">
          <button type="button">C</button>
        </IconHint>
      </>,
    );
    const ft = screen.getByTestId('ft');
    expect(Number.parseFloat(ft.style.left)).toBeLessThanOrEqual(window.innerWidth);
    fireEvent.focus(screen.getByRole('button', { name: 'C' }));
    expect(screen.getAllByRole('tooltip').map((t) => t.textContent)).toContain('Compare');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <p>
        Yield<InfoTip label="What yield means">Text</InfoTip>
      </p>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('EmptyState headingLevel', () => {
  it('renders an h2 by default and the level asked for', () => {
    const { container, rerender } = render(<EmptyState title="Nothing yet" />);
    expect(container.querySelector('h2')?.textContent).toBe('Nothing yet');
    rerender(<EmptyState title="Nothing yet" headingLevel={3} />);
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('h3')?.textContent).toBe('Nothing yet');
  });
});
