import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Chip, ChipRow, SegmentedControl, SegmentedSwitch } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const noop = () => {};
const options = [
  { value: 'd', label: 'Day' },
  { value: 'w', label: 'Week' },
  { value: 'm', label: 'Month', count: 3 },
] as const;

function Harness({ panelId }: { panelId?: string }) {
  const [v, setV] = useState<'d' | 'w' | 'm'>('d');
  return (
    <>
      <SegmentedControl options={[...options]} value={v} onChange={setV} prefix="period" label="Period" panelId={panelId} />
      {panelId ? (
        <div id={panelId} role="tabpanel" aria-labelledby={`period-${v}`}>
          {v}
        </div>
      ) : null}
    </>
  );
}

function Row() {
  const [v, setV] = useState('all');
  return (
    <ChipRow
      label="Sector"
      prefix="sec"
      value={v}
      onChange={setV}
      options={[
        { value: 'all', label: 'All' },
        { value: 'bank', label: 'Banks' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  const opts = [20, 60, 90].map((d) => ({ value: String(d), label: String(d) }));

  it('is a named toggle group with one pressed segment and test ids from the prefix', () => {
    const html = renderToString(<SegmentedControl label="Sessions" prefix="days" value="60" onChange={noop} options={opts} />);
    expect(html).toMatch(/<div class="kit-seg md" role="group" aria-label="Sessions"/);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*data-testid="days-60"/);
  });

  it.each(['sm', 'md', 'lg'] as const)('carries the %s height class shared with Select', (size) => {
    expect(renderToString(<SegmentedControl size={size} label="x" prefix="p" value="20" onChange={noop} options={opts} />)).toContain(`class="kit-seg ${size}"`);
  });

  it('tone accent, fill and disabled', () => {
    const html = renderToString(<SegmentedControl tone="accent" fill disabled label="x" prefix="p" value="20" onChange={noop} options={opts} />);
    expect(html).toContain('class="kit-seg md accent fill"');
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });

  it('click and arrow keys move the pressed segment; the count is shown', async () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Period' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Month/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Month/ }).querySelector('.count')?.textContent).toBe('3');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'Day' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('button', { name: /Month/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('is ARIA tabs with a roving tab stop when it controls a panel; SegmentedSwitch is the 44px size', () => {
    render(<Harness panelId="period-panel" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(renderToString(<SegmentedSwitch label="Views" prefix="v" panelId="panel" value="60" onChange={noop} options={opts} />)).toContain('class="kit-seg lg"');
  });

  it('has no serious axe violations as a group or as tabs', async () => {
    const a = render(<Harness />);
    expect(await seriousViolations(a.container)).toEqual([]);
    a.unmount();
    const b = render(<Harness panelId="p" />);
    expect(await seriousViolations(b.container)).toEqual([]);
  });
});

describe('Chip and ChipRow', () => {
  it('a chip is a toggle (aria-pressed) or, in a section nav, the current one (aria-current)', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <>
        <Chip selected onClick={onClick} count={4} testId="c1">
          Banks
        </Chip>
        <Chip current onClick={noop}>
          Overview
        </Chip>
        <Chip onClick={noop} label="One quarter">
          ¼
        </Chip>
      </>,
    );
    const banks = screen.getByRole('button', { name: /Banks/ });
    expect(banks.getAttribute('aria-pressed')).toBe('true');
    expect(banks.querySelector('.count')?.textContent).toBe('4');
    await userEvent.click(banks);
    expect(onClick).toHaveBeenCalledOnce();
    const overview = screen.getByRole('button', { name: 'Overview' });
    expect(overview.getAttribute('aria-current')).toBe('true');
    expect(overview.hasAttribute('aria-pressed')).toBe(false);
    expect(screen.getByRole('button', { name: 'One quarter' })).toBeTruthy();
  });

  it('ChipRow selects one, with test ids from the prefix', async () => {
    render(<Row />);
    expect(screen.getByRole('group', { name: 'Sector' })).toBeTruthy();
    await userEvent.click(screen.getByTestId('sec-bank'));
    expect(screen.getByTestId('sec-bank').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('sec-all').getAttribute('aria-pressed')).toBe('false');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<ChipRow label="Sector" prefix="s" value="a" onChange={noop} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', count: 2 }]} wrap size="sm" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
