import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrokerBadge } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

describe('BrokerBadge', () => {
  it('prints the number, decorative by default', () => {
    render(<BrokerBadge code={58} testId="b" />);
    const el = screen.getByTestId('b');
    expect(el.textContent).toBe('58');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('data-size')).toBe('36');
    expect(el.getAttribute('data-tone')).toBe('neutral');
  });
  it('keeps a string code as written', () => {
    render(<BrokerBadge code="07" testId="b" />);
    expect(screen.getByTestId('b').textContent).toBe('07');
  });
  it('names itself when it stands alone', () => {
    render(<BrokerBadge code={58} label="Broker 58" />);
    const el = screen.getByRole('img', { name: 'Broker 58' });
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });
  it('shows the caption only at the largest size', () => {
    const { rerender } = render(<BrokerBadge code={58} size={132} caption="Broker" tone="accent" testId="b" />);
    expect(screen.getByTestId('b').textContent).toBe('Broker58');
    expect(screen.getByTestId('b').getAttribute('data-tone')).toBe('accent');
    rerender(<BrokerBadge code={58} size={56} caption="Broker" testId="b" />);
    expect(screen.getByTestId('b').textContent).toBe('58');
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<><BrokerBadge code={58} label="Broker 58" /><BrokerBadge code={7} /></>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
