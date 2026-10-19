import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { SegmentedControl } from '../src/index.ts';
import { segmentTarget } from '../src/internal/segment-target.ts';
import { seriousViolations } from './axe.ts';

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

describe('segmentTarget', () => {
  it('wraps at both ends and handles Home/End', () => {
    const v = ['a', 'b', 'c'] as const;
    expect(segmentTarget(v, 'c', 'ArrowRight')).toBe('a');
    expect(segmentTarget(v, 'a', 'ArrowLeft')).toBe('c');
    expect(segmentTarget(v, 'b', 'Home')).toBe('a');
    expect(segmentTarget(v, 'b', 'End')).toBe('c');
    expect(segmentTarget(v, 'b', 'Enter')).toBeNull();
    expect(segmentTarget([], 'x', 'Home')).toBeNull();
  });
});

describe('SegmentedControl', () => {
  it('is a toggle group: click and arrow keys move the pressed segment', async () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Period' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Month/ }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'Day' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('is ARIA tabs with a roving tab stop when it controls a panel', () => {
    render(<Harness panelId="period-panel" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('has no serious axe violations as a group or as tabs', async () => {
    const a = render(<Harness />);
    expect(await seriousViolations(a.container)).toEqual([]);
    a.unmount();
    const b = render(<Harness panelId="p" />);
    expect(await seriousViolations(b.container)).toEqual([]);
  });
});
