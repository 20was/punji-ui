import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FairValueBar, fairValueReading, money, PriceTargetChart, ScoreRadar, scoreBand, scoreRadarReading, spreadLabels, type ScoreAxis } from '../src/index.ts';
import { boxesOverlap, radarLayout, wrapLabel } from '../src/score-radar/layout.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const live = (c: HTMLElement) => c.querySelector('[role="status"]')!.textContent;
const sr = (c: HTMLElement) => [...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | ');
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => x.textContent?.replaceAll(' ', ' ')));

const AXES: ScoreAxis[] = [
  { key: 'value', label: 'Value', score: 2, comparison: 3 },
  { key: 'future', label: 'Future', score: 4, comparison: 4 },
  { key: 'past', label: 'Past', score: 5, comparison: 3 },
  { key: 'health', label: 'Health', score: 6, comparison: 4 },
  { key: 'income', label: 'Income', score: 4, comparison: 2 },
];

describe('ScoreRadar', () => {
  it('speaks and prints the total, strongest and weakest axis', () => {
    const { container } = render(<ScoreRadar label="Scores" axes={AXES} testId="r" />);
    expect(sr(container)).toContain('Total 21 of 30; strongest Health 6, weakest Value 2.');
    expect(container.querySelector('.pu-sr-total')?.textContent).toMatch(/Total\s*21\s*of 30.*Strong/);
    expect(container.querySelector('figure')?.getAttribute('data-band')).toBe('high');
    expect(container.querySelector('[data-testid="r-shape"]')?.getAttribute('class')).toContain('high');
  });

  it('prints each axis number beside its name, and the table has axis, score, max and comparison', () => {
    const { container } = render(<ScoreRadar label="Scores" axes={AXES} labels={{ comparison: 'Sector average' }} />);
    expect(container.querySelectorAll('.pu-sr-label').length).toBe(5);
    expect(container.querySelector('.pu-sr-label')?.textContent).toBe('Value2/6');
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Axis', 'Score', 'Maximum', 'Sector average']);
    expect(cells(container)).toEqual([
      ['Value', '2', '6', '3'],
      ['Future', '4', '6', '4'],
      ['Past', '5', '6', '3'],
      ['Health', '6', '6', '4'],
      ['Income', '4', '6', '2'],
    ]);
    expect(container.querySelector('.pu-sr-compare')).not.toBeNull();
  });

  it('colours by total band and says the band in words', () => {
    expect(scoreBand(5, 30)).toBe('low');
    expect(scoreBand(15, 30)).toBe('mid');
    expect(scoreBand(20, 30)).toBe('high');
    const low = AXES.map((a) => ({ ...a, score: 1, comparison: undefined }));
    const { container } = render(<ScoreRadar label="Scores" axes={low} />);
    expect(container.querySelector('.pu-sr-total')?.textContent).toContain('Weak');
    expect(container.querySelector('.pu-sr-shape')?.getAttribute('class')).toContain('low');
    expect(container.querySelector('.pu-sr-compare')).toBeNull();
    expect([...container.querySelectorAll('thead th')]).toHaveLength(3);
  });

  it('clamps scores, honours per-axis maximums and 3 to 8 axes', () => {
    const r = scoreRadarReading([{ key: 'a', label: 'A', score: 99 }, { key: 'b', label: 'B', score: -3, max: 10 }, { key: 'c', label: 'C', score: Number.NaN }]);
    expect(r.scores).toEqual([6, 0, 0]);
    expect(r.totalMax).toBe(22);
    const eight = Array.from({ length: 10 }, (_, i) => ({ key: `k${i}`, label: `Axis ${i}`, score: 3 }));
    const { container } = render(<ScoreRadar label="Eight" axes={eight} />);
    expect(container.querySelectorAll('.pu-sr-label').length).toBe(8);
    const two = render(<ScoreRadar label="Two" axes={AXES.slice(0, 2)} />);
    expect(two.container.textContent).toBe('At least 3 scores are needed');
  });

  it('moves a keyboard cursor across the axes and speaks each', async () => {
    const user = userEvent.setup();
    const { container } = render(<ScoreRadar label="Scores" axes={AXES} />);
    expect(live(container)).toBe('');
    await user.tab();
    expect(live(container)).toBe('Income 4 of 6, Comparison 2');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Value 2 of 6, Comparison 3');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(live(container)).toBe('Past 5 of 6, Comparison 3');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('selects an axis with Enter or Space (uncontrolled and controlled)', async () => {
    const user = userEvent.setup();
    const seen: (string | null)[] = [];
    function Host() {
      const [sel, setSel] = useState<string | null>(null);
      return <ScoreRadar label="Scores" axes={AXES} selected={sel} onSelectedChange={(k) => { seen.push(k); setSel(k); }} testId="r" />;
    }
    const { container } = render(<Host />);
    await user.tab();
    await user.keyboard('{Home}{Enter}');
    expect(seen).toEqual(['value']);
    expect(container.querySelector('[data-testid="r-value"]')?.getAttribute('data-selected')).toBe('true');
    expect(live(container)).toContain('selected');
    await user.keyboard(' ');
    expect(seen).toEqual(['value', null]);
    expect(container.querySelector('[data-selected]')).toBeNull();
    const plain = render(<ScoreRadar label="Plain" axes={AXES} />);
    await user.click(plain.container.querySelector('[tabindex="0"]')!);
    await user.keyboard('{Enter}');
    expect(plain.container.querySelector('[data-selected]')).toBeNull();
  });

  it('lays out 3 to 8 axes with long names without overlap or clipping from 280 px up', () => {
    const names = ['Future performance outlook', 'Past performance record', 'Financial health and leverage', 'Dividend track record', 'Value against peers', 'Ownership', 'Management quality', 'Liquidity'];
    for (const width of [280, 320, 360, 390, 480, 640]) {
      for (let n = 3; n <= 8; n += 1) {
        const l = radarLayout(width, names.slice(0, n), names.slice(0, n).map(() => '6/6'));
        l.boxes.forEach((a, i) => {
          expect(a.x).toBeGreaterThanOrEqual(l.view.x);
          expect(a.x + a.w).toBeLessThanOrEqual(l.view.x + l.view.w);
          expect(a.y).toBeGreaterThanOrEqual(l.view.y);
          expect(a.y + a.h).toBeLessThanOrEqual(l.view.y + l.view.h);
          l.boxes.slice(i + 1).forEach((b, j) => expect(boxesOverlap(a, b), `${width}px n=${n}: ${i} vs ${i + j + 1}`).toBe(false));
          // A label never covers the ring itself.
          const nx = Math.max(a.x, Math.min(0, a.x + a.w));
          const ny = Math.max(a.y, Math.min(0, a.y + a.h));
          expect(Math.hypot(nx, ny)).toBeGreaterThan(l.r);
        });
        expect(l.view.w).toBeLessThanOrEqual(width);
      }
    }
    expect(wrapLabel('Future performance outlook', 12)).toEqual(['Future', 'performance…'.length > 12 ? 'performan…' : 'performance…']);
  });

  it('has no serious axe violations, selectable or not', async () => {
    const { container } = render(<ScoreRadar label="Scores" axes={AXES} defaultSelected="past" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('FairValueBar', () => {
  it('works the gap in bigint from decimal strings, with no float drift', () => {
    // 0.3 / 0.1 is 2.9999999999999996 as floats; here it is exactly +200%.
    expect(fairValueReading('0.3', '0.1')?.gapTenths).toBe(2000n);
    expect(fairValueReading('77.00', '100.00')?.gapTenths).toBe(-230n);
    // 12345678901234567890.12 is past the float range.
    expect(fairValueReading('24691357802469135780.24', '12345678901234567890.12')?.gapTenths).toBe(1000n);
    expect(fairValueReading('1', '3')?.gapTenths).toBe(-667n);
    expect(fairValueReading('100', '0')).toBeNull();
    expect(fairValueReading('abc', '10')).toBeNull();
  });

  it('applies the thresholds at the boundary, inclusively', () => {
    expect(fairValueReading('80.00', '100.00')?.verdict).toBe('undervalued');
    expect(fairValueReading('80.01', '100.00')?.verdict).toBe('fair');
    expect(fairValueReading('120.00', '100.00')?.verdict).toBe('overvalued');
    expect(fairValueReading('119.99', '100.00')?.verdict).toBe('fair');
    expect(fairValueReading('88', '100', { undervalued: 10, overvalued: 30 })?.verdict).toBe('undervalued');
    expect(fairValueReading('125', '100', { overvalued: 30 })?.verdict).toBe('fair');
  });

  it('prints the gap with a sign and a word, and the verdict', () => {
    const { container } = render(<FairValueBar label="Valuation" price="77.00" fairValue="100.00" testId="f" />);
    const gap = container.querySelector('.pu-fvb-gap')!;
    expect(gap.textContent).toContain('−23%');
    expect(gap.textContent).toContain('below fair value');
    expect(gap.textContent).toContain('Undervalued');
    expect(container.querySelector('.pu-fvb-read')?.textContent?.replaceAll('\u00a0', ' ')).toContain('NPR 77.00');
    expect(container.querySelector('figure')?.getAttribute('data-verdict')).toBe('undervalued');
    const over = render(<FairValueBar label="Valuation" price="125.50" fairValue="100" />);
    expect(over.container.querySelector('.pu-fvb-gap')?.textContent).toMatch(/\+25\.5%.*above fair value.*Overvalued/);
  });

  it('accepts Money and groups lakhs without drift', () => {
    const { container } = render(<FairValueBar label="Valuation" price={money(123_456_789_012_345_678n, 'NPR')} fairValue={money(100_000_000_000_000_000n, 'NPR')} />);
    expect(container.querySelector('.pu-fvb-read')?.textContent?.replaceAll(' ', ' ')).toContain('NPR 1,23,45,67,89,01,23,456.78');
    expect(container.querySelector('.pu-fvb-pct')?.textContent).toBe('+23.5%');
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<FairValueBar label="x" price={money(1n, 'USD')} fairValue={money(1n, 'NPR')} />)).toThrow(TypeError);
    quiet.mockRestore();
  });

  it('speaks a summary, moves a cursor through price, fair value and difference, and has a table', async () => {
    const user = userEvent.setup();
    const { container } = render(<FairValueBar label="Valuation" price="77.00" fairValue="100.00" />);
    expect(sr(container)).toContain('Current price NPR 77.00 is 23% below fair value (fair value NPR 100.00): Undervalued.');
    await user.tab();
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Current price NPR 77.00');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toBe('Fair value NPR 100.00');
    await user.keyboard('{End}');
    expect(live(container)).toBe('Difference −23% below fair value: Undervalued');
    expect(cells(container)).toEqual([
      ['Current price', 'NPR 77.00'],
      ['Fair value', 'NPR 100.00'],
      ['Difference', '−23% below fair value'],
      ['Verdict', 'Undervalued'],
    ]);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('says so when the fair value is missing or not above zero', () => {
    const { container } = render(<FairValueBar label="Valuation" price="10" fairValue="0" />);
    expect(container.textContent).toBe('Fair value is not available');
    expect(container.querySelector('[tabindex]')).toBeNull();
  });
});

describe('PriceTargetChart', () => {
  const history = [
    { date: '2026-08-03', close: '100.10' },
    { date: '2026-09-01', close: '104.55' },
    { date: '2026-10-01', close: '99.90' },
    { date: '2026-11-03', close: '110.05' },
  ];
  const targets = { date: '2027-05-03', low: '95.00', average: '121.055', high: '140' };

  it('prints exact decimals in the table, summary and live region', async () => {
    const user = userEvent.setup();
    const { container } = render(<PriceTargetChart label="Targets" history={history} targets={targets} testId="p" />);
    const rows = cells(container);
    expect(rows[3]).toEqual(['2026-11-03', 'NPR 110.05', '—', '—', '—']);
    expect(rows[4]).toEqual(['2027-05-03', '—', 'NPR 95.00 (−13.7%)', 'NPR 121.055 (+10%)', 'NPR 140.00 (+27.2%)']);
    expect(sr(container)).toContain('Analyst targets for 2027-05-03: low NPR 95.00');
    expect(sr(container)).toContain('The average is +10% above the current price.');
    await user.tab();
    expect(live(container)).toContain('2027-05-03: Low NPR 95.00');
    expect(container.querySelector('.pu-pt-implied')?.textContent?.replaceAll(' ', ' ')).toBe('Average NPR 121.055: +10% above the current price');
    expect(container.querySelector('[data-testid="p-high"] .pu-pt-tn')?.textContent).toBe('140.00');
  });

  it('has no float drift in percentages (0.3 against 0.1) and accepts Money', () => {
    const { container } = render(
      <PriceTargetChart
        label="Targets"
        history={[{ date: '2026-01-01', close: '0.1' }, { date: '2026-01-02', close: money(10n, 'NPR') }]}
        targets={{ date: '2026-02-01', low: '0.1', average: '0.3', high: '0.35' }}
      />,
    );
    expect(cells(container).at(-1)).toEqual(['2026-02-01', '—', 'NPR 0.10 (0%)', 'NPR 0.30 (+200%)', 'NPR 0.35 (+250%)']);
  });

  it('moves the cursor through the closes and then the targets', async () => {
    const user = userEvent.setup();
    const { container } = render(<PriceTargetChart label="Targets" history={history} targets={targets} />);
    await user.tab();
    await user.keyboard('{Home}');
    expect(live(container)).toBe('2026-08-03: Close NPR 100.10');
    await user.keyboard('{End}{ArrowLeft}');
    expect(live(container)).toBe('2026-11-03: Close NPR 110.05');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('spreads the three target labels apart when the targets are close together', () => {
    const { container } = render(
      <PriceTargetChart label="Targets" history={history} targets={{ date: '2027-05-03', low: '110.00', average: '110.02', high: '110.04' }} testId="p" />,
    );
    const ys = (['high', 'average', 'low'] as const).map((k) => Number(container.querySelector(`[data-testid="p-${k}"] text`)!.getAttribute('y')));
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(30);
    expect(ys[2]! - ys[1]!).toBeGreaterThanOrEqual(30);
    expect(spreadLabels([100, 101, 102], 30, 0, 400)).toEqual([100, 130, 160]);
    expect(spreadLabels([390, 395, 400], 30, 0, 400)).toEqual([340, 370, 400]);
    expect(spreadLabels([200, 10, 100], 30, 0, 400)).toEqual([200, 10, 100]);
  });

  it('draws history alone without targets, skips bad rows, and shows an empty message', () => {
    const only = render(<PriceTargetChart label="Hist" history={[...history, { date: 'nope', close: '1' }, { date: '2026-11-04', close: 'x' }]} />);
    expect(only.container.querySelector('.pu-pt-fan')).toBeNull();
    expect(cells(only.container)).toHaveLength(4);
    const empty = render(<PriceTargetChart label="None" history={[]} />);
    expect(empty.container.textContent).toBe('No data');
  });

  it('caps the table at the latest 500 closes', () => {
    const many = Array.from({ length: 600 }, (_, i) => ({ date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10), close: `${100 + (i % 7)}.25` }));
    const { container } = render(<PriceTargetChart label="Many" history={many} targets={{ date: '2027-06-01', low: '90', average: '110', high: '130' }} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(501);
    expect(container.textContent).toContain('Showing the latest 500 of 600 closes');
  });

  it('refuses mixed currencies and has no serious axe violations', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<PriceTargetChart label="x" history={[{ date: '2026-01-01', close: money(1n, 'USD') }]} targets={{ date: '2026-02-01', low: money(1n, 'NPR'), average: '2', high: '3' }} />)).toThrow(TypeError);
    quiet.mockRestore();
    const { container } = render(<PriceTargetChart label="Targets" history={history} targets={targets} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
