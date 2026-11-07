import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Calendar } from '../src/calendar/Calendar.tsx';
import { FinancialPeriodSelector, nepalFiscalYearPeriods } from '../src/period-selector/FinancialPeriodSelector.tsx';
import { DateRangePresetList } from '../src/date-picker/DateRangePresetList.tsx';
import { DualDate, dualDateText } from '../src/internal/dualDate.tsx';
import { Timeline } from '../src/article/Article.tsx';
import { IssueCard } from '../src/issue-card/IssueCard.tsx';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);
// 2027-04-30 is BS 2084 Baisakh 17 (projected); 2026-11-07 is BS 2083 Kartik (official).
const PROJECTED = '2027-04-30';
const OFFICIAL = '2026-11-07';

describe('DualDate marker', () => {
  it('reports provenance with the text', () => {
    expect(dualDateText(PROJECTED).bsStatus).toBe('projected');
    expect(dualDateText(OFFICIAL).bsStatus).toBe('official');
  });
  it('marks a projected BS date with a word and an explanation, and nothing else', () => {
    const { container } = render(<><DualDate value={PROJECTED} /><DualDate value={OFFICIAL} /></>);
    const dates = container.querySelectorAll('time');
    expect(within(dates[0] as HTMLElement).getByText('projected')).toBeTruthy();
    expect((dates[0] as HTMLElement).textContent).toMatch(/Nepal Panchanga Nirnayak Bikas Samiti/);
    expect(dates[0]!.querySelector('[title]')?.getAttribute('title')).toMatch(/has not published/i);
    expect(dates[1]!.querySelector('.pu-bs-flag')).toBeNull();
    expect(dates[1]!.textContent).not.toMatch(/projected|unverified/);
  });
  it('marks the BS line when AD leads, and honours labels', () => {
    const { container } = render(<DualDate value={PROJECTED} primary="ad" labels={{ projected: 'अनुमानित', projectedHint: 'कारण' }} />);
    expect(container.querySelector('.pu-dual-date-b')!.textContent).toContain('अनुमानित');
    expect(container.querySelector('.pu-dual-date-a')!.textContent).not.toContain('अनुमानित');
    expect(screen.queryByText('projected')).toBeNull();
  });
  it('keeps the unverified note quiet: screen-reader text only', () => {
    let unverified: string | null = null;
    for (let year = 1920; year < 2000 && !unverified; year += 1) {
      for (const day of [`${year}-01-15`, `${year}-06-15`, `${year}-10-15`]) if (dualDateText(day).bsStatus === 'unverified') { unverified = day; break; }
    }
    if (!unverified) return; // the table has none in this window
    const { container } = render(<DualDate value={unverified} />);
    expect(container.querySelector('.pu-bs-flag')).toBeNull();
    expect(container.querySelector('.kit-sr')!.textContent).toMatch(/unverified/);
  });
  it('flows through IssueCard labels and Timeline', () => {
    render(<IssueCard issue={{ id: 'x', company: 'Demo Co', symbol: 'DEMO', kind: 'ipo', shareGroup: 'x', openDate: '2027-04-14', closeDate: PROJECTED, units: 10n, pricePerUnit: 10000n, minKitta: 10n, maxKitta: 100n, kittaMultiple: 10n, issueManager: 'M' }} today="2027-04-12" labels={{ projected: 'est.' }} />);
    expect(screen.getAllByText('est.').length).toBe(2);
    cleanup();
    render(<Timeline label="Plan" milestones={[{ date: PROJECTED, items: ['Close'] }, { date: OFFICIAL, items: ['Now'] }]} />);
    expect(screen.getAllByText('projected').length).toBe(1);
  });
  it('has no axe violations', async () => {
    const { container } = render(<ul><li><DualDate value={PROJECTED} /></li><li><DualDate value={PROJECTED} primary="ad" /></li></ul>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const month = (defaultMonth: string, calendar: 'bikram-sambat' | 'gregory' = 'bikram-sambat') =>
  render(<Calendar label="Pick" calendar={calendar} value={null} onChange={() => {}} today={OFFICIAL} defaultMonth={defaultMonth} />);

describe('Calendar note', () => {
  it('shows the note for a projected BS month and describes the grid with it', () => {
    const { container } = month(PROJECTED);
    const note = container.querySelector('.pu-cal-note')!;
    expect(note.textContent).toMatch(/Projected month/);
    expect(screen.getByRole('grid').getAttribute('aria-describedby')).toContain(note.id);
    expect(container.querySelector('button[data-date="2027-04-30"]')!.getAttribute('aria-disabled')).toBeNull();
  });
  it('is absent for an official month and for Gregorian', () => {
    expect(month(OFFICIAL).container.querySelector('.pu-cal-note')).toBeNull();
    cleanup();
    expect(month(PROJECTED, 'gregory').container.querySelector('.pu-cal-note')).toBeNull();
  });
  it('keeps days selectable and passes axe', async () => {
    const picked: (string | null)[] = [];
    const { container } = render(<Calendar label="Pick" calendar="bikram-sambat" value={null} onChange={(v) => picked.push(v)} today={OFFICIAL} defaultMonth={PROJECTED} />);
    container.querySelector<HTMLButtonElement>('button[data-date="2027-04-30"]')!.click();
    expect(picked).toEqual(['2027-04-30']);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('has Nepali words', () => {
    const { container } = render(<Calendar label="Pick" calendar="bikram-sambat" language="ne" value={null} onChange={() => {}} today={OFFICIAL} defaultMonth={PROJECTED} />);
    expect(container.querySelector('.pu-cal-note')!.textContent).toContain('अनुमानित');
  });
});

describe('fiscal period and presets', () => {
  const periods = nepalFiscalYearPeriods(2082, 2083);
  it('flags only the period that ends in a projected month', () => {
    expect(periods.map((p) => p.projected)).toEqual([false, true]);
    const { container, rerender } = render(<FinancialPeriodSelector periods={periods} value="fy-2083" onChange={() => {}} label="Period" />);
    expect(container.querySelector('.pu-period-detail .pu-bs-flag')!.textContent).toMatch(/^projected/);
    rerender(<FinancialPeriodSelector periods={periods} value="fy-2082" onChange={() => {}} label="Period" />);
    expect(container.querySelector('.pu-bs-flag')).toBeNull();
  });
  it('names the projected preset and passes axe', async () => {
    const range = { start: '2027-04-14', end: PROJECTED };
    const { container } = render(<DateRangePresetList presets={[{ id: 'today', label: 'Trip', range, projected: true }, { id: 'this-week', label: 'Past', range }]} value={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Trip.*projected/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Past' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
});
