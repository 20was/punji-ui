import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as root from '../src/index.ts';
import { RiskMeter, riskLevelLabels } from '../src/risk-meter/RiskMeter.tsx';
import { seriousViolations } from './axe.ts';

describe('RiskMeter', () => {
  it('prints the level in words beside the dial', async () => {
    const { container } = render(<RiskMeter level={4} caption="Principal at moderately high risk" testId="risk" />);
    const meter = screen.getByTestId('risk');
    expect(meter.dataset.level).toBe('4');
    expect(meter.textContent).toContain('Moderately high');
    expect(meter.textContent).toContain('4 of 6');
    expect(container.querySelectorAll('.pu-risk-seg')).toHaveLength(6);
    expect(container.querySelector('.pu-risk-seg[data-current]')?.getAttribute('data-tone')).toBe('3');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('draws a compact bar with the position for screen readers', async () => {
    const { container } = render(<RiskMeter level={2} variant="bar" levels={['Low', 'Medium', 'High']} position={(l, n) => `step ${l}/${n}`} testId="bar" />);
    expect(screen.getByTestId('bar').textContent).toBe('Risk Medium, step 2/3');
    expect(container.querySelectorAll('.pu-risk-steps i[data-on]')).toHaveLength(2);
    expect(container.querySelector('.pu-risk-steps i[data-current]')?.getAttribute('data-tone')).toBe('3');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('refuses a level off the scale', () => {
    expect(() => render(<RiskMeter level={7} />)).toThrow(RangeError);
    expect(() => render(<RiskMeter level={1} levels={['A', 'B']} />)).toThrow(RangeError);
  });

  it('is exported from the root', () => {
    expect(root.RiskMeter).toBe(RiskMeter);
    expect(riskLevelLabels).toHaveLength(6);
  });
});
