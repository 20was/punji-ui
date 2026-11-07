import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { scaledText, StyleGrid, styleGridTotal, type StyleGridCell } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const live = (c: HTMLElement) => c.querySelector('[role="status"]')!.textContent;
const sr = (c: HTMLElement) => [...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | ');
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => x.textContent));

const CELLS: StyleGridCell[] = [
  { size: 'large', style: 'value', weight: '10.1' },
  { size: 'large', style: 'blend', weight: '20.2' },
  { size: 'large', style: 'growth', weight: 64.5 },
  { size: 'mid', style: 'growth', weight: '5' },
  { size: 'small', style: 'value', weight: '0.2' },
];

describe('styleGridTotal', () => {
  it('adds weights exactly, with no float error', () => {
    expect(styleGridTotal([{ size: 'large', style: 'value', weight: '0.1' }, { size: 'mid', style: 'value', weight: '0.2' }])).toBe('0.3');
    expect(styleGridTotal(CELLS)).toBe('100');
    expect(styleGridTotal([])).toBeNull();
    expect(styleGridTotal([{ size: 'mid', style: 'blend', weight: 'abc' }, { size: 'mid', style: 'value', weight: '-3' }, { size: 'mid', style: 'growth', weight: '1e2' }])).toBeNull();
  });

  it('prints a scaled integer without trailing zeros', () => {
    expect(scaledText(10050n, 2)).toBe('100.5');
    expect(scaledText(10000n, 2)).toBe('100');
    expect(scaledText(5n, 3)).toBe('0.005');
    expect(scaledText(7n, 0)).toBe('7');
  });
});

describe('StyleGrid', () => {
  it('has a real size by style table with the weights and the selected cell in words', () => {
    const { container } = render(<StyleGrid label="Fund placement" cells={CELLS} selected={{ size: 'large', style: 'growth' }} />);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Size', 'Value', 'Blend', 'Growth']);
    expect(cells(container)).toEqual([
      ['Large', '10.1%', '20.2%', '64.5% (selected)'],
      ['Mid', '—', '—', '5%'],
      ['Small', '0.2%', '—', '—'],
    ]);
    expect(container.querySelector('tbody th')?.getAttribute('scope')).toBe('row');
    expect(sr(container)).toContain('Fund placement: Selected Large growth, 64.5%. Largest weight Large growth at 64.5%.');
    expect(sr(container)).toContain('Total: 100%');
  });

  it('marks the selected cell with a ring, a tick and a word, never colour alone', () => {
    const { container } = render(<StyleGrid label="Placement" selected={{ size: 'mid', style: 'blend' }} testId="g" />);
    const cell = container.querySelector('[data-testid="g-mid-blend"]')!;
    expect(cell.getAttribute('data-selected')).toBe('true');
    expect(cell.textContent).toContain('✓');
    expect(cell.textContent).toContain('Selected');
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('.pu-sg-cell')).toHaveLength(9);
  });

  it('shows all nine cells and no weights when none are given', () => {
    const { container } = render(<StyleGrid label="Empty" />);
    expect(container.querySelectorAll('.pu-sg-cell')).toHaveLength(9);
    expect(container.querySelector('.pu-sg-total')).toBeNull();
    expect(sr(container)).toContain('Empty: No cell selected.');
  });

  it('moves a keyboard cursor across the cells, rows with up and down', async () => {
    const user = userEvent.setup();
    const { container } = render(<StyleGrid label="Placement" cells={CELLS} selected={{ size: 'large', style: 'growth' }} />);
    await user.tab();
    expect(live(container)).toBe('Small growth, —');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Large value, 10.1%');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(live(container)).toBe('Large growth, 64.5%, selected');
    await user.keyboard('{ArrowDown}');
    expect(live(container)).toBe('Mid growth, 5%');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(live(container)).toBe('Small growth, —');
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(live(container)).toBe('Large growth, 64.5%, selected');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('lets every word be replaced', () => {
    const { container } = render(<StyleGrid label="Placement" selected={{ size: 'small', style: 'value' }} labels={{ sizes: { small: 'Sana' }, styles: { value: 'Mulya' }, selected: 'Chosen', size: 'Aakar' }} />);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Aakar', 'Mulya', 'Blend', 'Growth']);
    expect(sr(container)).toContain('Chosen Sana mulya');
  });

  it('keeps the last of a cell given twice and ignores a weight that is not a decimal', () => {
    const { container } = render(<StyleGrid label="P" cells={[{ size: 'mid', style: 'value', weight: '1' }, { size: 'mid', style: 'value', weight: '2' }, { size: 'mid', style: 'blend', weight: 'x' }]} />);
    expect(cells(container)[1]).toEqual(['Mid', '2%', '—', '—']);
  });

  it('is not a tab stop when not interactive, and has no serious axe violations', async () => {
    const off = render(<StyleGrid label="P" cells={CELLS} interactive={false} />);
    expect(off.container.querySelector('[tabindex]')).toBeNull();
    off.unmount();
    const { container } = render(<StyleGrid label="Placement" cells={CELLS} selected={{ size: 'large', style: 'growth' }} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
