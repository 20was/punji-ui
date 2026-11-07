import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getMarketSession, marketSessionSentence, MarketStatus, nepseSchedule, type MarketState } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const dashain = { ...nepseSchedule, holidays: [{ date: '2026-10-20', name: 'Dashain' }] };

describe('marketSessionSentence', () => {
  it('a holiday is called by its name with the prices date and the next trading open', () => {
    const session = getMarketSession(new Date('2026-10-20T06:00:00Z'), dashain);
    expect(marketSessionSentence(session, { lastCloseDate: '2026-10-19', schedule: dashain })).toBe('Closed for Dashain · prices of 19 Oct · opens Wed 21 Oct, 11:00');
  });
  it('a holiday without a name says so, never inventing one', () => {
    const noName = { ...nepseSchedule, holidays: [{ date: '2026-10-20' }] };
    expect(marketSessionSentence(getMarketSession(new Date('2026-10-20T06:00:00Z'), noName), { schedule: noName })).toBe('Closed for a holiday · opens Wed 21 Oct, 11:00');
  });
  it('a plain close (the weekend) follows the pre-open to the open', () => {
    const session = getMarketSession(new Date('2026-10-16T08:00:00Z'), nepseSchedule);
    expect(marketSessionSentence(session, { lastCloseDate: '2026-10-15' })).toBe('Market closed · prices of 15 Oct · opens Sun 18 Oct, 11:00');
  });
  it('pre-open, open, halted and offline', () => {
    expect(marketSessionSentence(getMarketSession(new Date('2026-10-18T05:00:00Z'), nepseSchedule))).toBe('Pre-open · opens Sun 18 Oct, 11:00');
    expect(marketSessionSentence(getMarketSession(new Date('2026-10-18T06:00:00Z'), nepseSchedule))).toBe('Live');
    expect(marketSessionSentence(getMarketSession(new Date('2026-10-18T06:00:00Z'), nepseSchedule, { halted: true }))).toBe('Halted');
    const open = getMarketSession(new Date('2026-10-18T06:00:00Z'), nepseSchedule);
    expect(marketSessionSentence(open, { state: 'offline', note: 'as of 13:42' })).toBe('Offline · as of 13:42');
    expect(marketSessionSentence(open, { state: 'offline' })).toBe('Offline');
  });
  it('an unknown or malformed date drops the date, not the line; another year carries its year', () => {
    const closed = getMarketSession(new Date('2026-10-16T08:00:00Z'), nepseSchedule);
    expect(marketSessionSentence(closed, { lastCloseDate: null })).toBe('Market closed · opens Sun 18 Oct, 11:00');
    expect(marketSessionSentence(closed, { lastCloseDate: 'soon' })).toBe('Market closed · opens Sun 18 Oct, 11:00');
    expect(marketSessionSentence(closed, { lastCloseDate: '2025-12-29' })).toContain('prices of 29 Dec 2025');
  });
  it('takes the words in the reader’s language', () => {
    const session = getMarketSession(new Date('2026-10-20T06:00:00Z'), dashain);
    const out = marketSessionSentence(session, { schedule: dashain, labels: { holidayNamed: (n) => `${n}का कारण बन्द`, opens: (w) => `${w} खुल्छ` } });
    expect(out.startsWith('Dashainका कारण बन्द')).toBe(true);
    expect(out.endsWith('खुल्छ')).toBe(true);
  });
});

describe('MarketStatus offline and index', () => {
  it('says offline in words with an icon unlike every other state', () => {
    const states: MarketState[] = ['open', 'pre-open', 'closed', 'halted', 'holiday', 'offline'];
    const shapes = states.map((state) => {
      const { container, unmount } = render(<MarketStatus state={state} />);
      const html = container.querySelector('svg')!.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(shapes).size).toBe(states.length);
    render(<MarketStatus state="offline" market="NEPSE" />);
    expect(screen.getByRole('status').textContent).toBe('NEPSE: Offline');
  });
  it('is unchanged without an index (one element, same text)', () => {
    const { container } = render(<MarketStatus state="closed" testId="s" />);
    expect((container.firstElementChild as HTMLElement).getAttribute('role')).toBe('status');
    expect(container.querySelector('.pu-market-status-wrap')).toBeNull();
  });
  it('prints the index outside the live region with an arrow, the sign and a word', () => {
    render(<MarketStatus state="open" testId="s" index={{ name: 'NEPSE', value: '2,641.18', change: '+0.42%', direction: 'up' }} />);
    expect(screen.getByRole('status').textContent).toBe('Open');
    const index = screen.getByTestId('s-index');
    expect(index.textContent).toBe('NEPSE2,641.18+0.42% up');
    expect(index.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(index.closest('[role="status"]')).toBeNull();
  });
  it('says down and unchanged in the reader’s words, and draws no arrow when flat', () => {
    const { rerender } = render(<MarketStatus state="open" testId="s" index={{ value: '2,600.00', change: '−0.10%', direction: 'down' }} changeLabels={{ down: 'नेपसी तल' }} />);
    expect(screen.getByTestId('s-index').textContent).toContain('नेपसी तल');
    rerender(<MarketStatus state="open" testId="s" index={{ value: '2,600.00', change: '0.00%' }} />);
    expect(screen.getByTestId('s-index').textContent).toContain('unchanged');
    expect(screen.getByTestId('s-index').querySelector('svg')).toBeNull();
  });
  it('draws no change at all when it is unknown, never a 0', () => {
    render(<MarketStatus state="closed" testId="s" index={{ value: '2,641.18' }} />);
    expect(screen.getByTestId('s-index').textContent).toBe('2,641.18');
  });
  it('passes axe', async () => {
    const { container } = render(<MarketStatus state="offline" market="NEPSE" detail="as of 13:42" index={{ name: 'NEPSE', value: '2,641.18', change: '+0.42%', direction: 'up' }} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
