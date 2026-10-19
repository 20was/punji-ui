import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Tabs } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const OPTS = [
  { value: 'overview', label: 'Overview' },
  { value: 'history', label: 'History', count: 12 },
  { value: 'notes', label: 'Notes' },
];

function Harness({ fill }: { fill?: boolean }) {
  const [v, setV] = useState('overview');
  return (
    <>
      <Tabs options={OPTS} value={v} onChange={setV} prefix="t" label="Sections" panelId="panel" fill={fill} testId="tabs" />
      <div id="panel" role="tabpanel" aria-labelledby={`t-${v}`}>
        {v}
      </div>
    </>
  );
}

describe('Tabs', () => {
  it('is a named tab list with one selected tab and a roving tab stop', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs.every((t) => t.getAttribute('aria-controls') === 'panel')).toBe(true);
    expect(tabs[1]?.querySelector('.count')?.textContent).toBe('12');
  });

  it('clicks, arrows (wrapping), Home and End move the selection; up and down do not', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(screen.getByRole('tabpanel').textContent).toBe('history');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel').textContent).toBe('notes');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel').textContent).toBe('overview');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tabpanel').textContent).toBe('notes');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tabpanel').textContent).toBe('overview');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('tabpanel').textContent).toBe('overview');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tabpanel').textContent).toBe('notes');
  });

  it('fill shares the width', () => {
    render(<Harness fill />);
    expect(screen.getByTestId('tabs').className).toBe('kit-tabs fill');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<Harness />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
