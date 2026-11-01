/**
 * CorporateActionTimeline: a company's corporate-action dates in order (announcement, AGM, book close, right issue
 * window, listing, credit), each in Bikram Sambat and Gregorian, marked as done, today or upcoming in words and
 * shape, with "in 5 days" for what is ahead. An ordered list; the next date carries `aria-current="date"`. It
 * shows the dates you pass and decides nothing.
 */
import type { ReactNode } from 'react';

import { DualDate } from '../internal/dualDate.tsx';
import type { NepalLanguage } from '../nepal/locale.ts';
import { CORPORATE_EVENT_LABELS, corporateTimeline, type CorporateEvent, type CorporateEventKind, type CorporateEventPhase } from '../share-issues/corporate-actions.ts';

export interface CorporateActionTimelineLabels {
  /** Words for each phase, read after the date. */
  phase: Record<CorporateEventPhase, string>;
  /** Relative note: positive days ahead, negative days ago. Return '' to hide it. */
  relative: (days: number) => string;
}

export const DEFAULT_CORPORATE_ACTION_TIMELINE_LABELS: CorporateActionTimelineLabels = {
  phase: { past: 'Done', today: 'Today', upcoming: 'Upcoming' },
  relative: (days) => (days === 0 ? '' : days === 1 ? 'Tomorrow' : days > 1 ? `In ${days} days` : ''),
};

const MARKS: Record<CorporateEventPhase, ReactNode> = {
  past: <path d="M3 8.5 6.5 12 13 4.5" />,
  today: <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" fill="currentColor" /></>,
  upcoming: <circle cx="8" cy="8" r="5.5" strokeDasharray="2.5 2.5" />,
};

export interface CorporateActionTimelineProps {
  /** The events, any order; shown oldest first. */
  events: readonly CorporateEvent[];
  /** Today, Gregorian `YYYY-MM-DD`, from your server's business day. */
  today: string;
  /** Names the list. Default 'Corporate action dates'. */
  label?: string;
  /** Which calendar leads. Default 'bs'. */
  primaryCalendar?: 'bs' | 'ad';
  /** Month names. Default 'en'. */
  language?: NepalLanguage;
  /** Digits. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Words for kinds, in the reader's language. */
  kindLabels?: Partial<Record<CorporateEventKind, string>>;
  /** Replace the phase and relative words. */
  labels?: Partial<CorporateActionTimelineLabels>;
  className?: string;
  /** Sets `data-testid` on the list; items get `<id>-<event id>`. */
  testId?: string;
}

export function CorporateActionTimeline({
  events, today, label = 'Corporate action dates', primaryCalendar = 'bs', language, digits, kindLabels, labels, className, testId,
}: CorporateActionTimelineProps) {
  const words = { ...DEFAULT_CORPORATE_ACTION_TIMELINE_LABELS, ...labels };
  const rows = corporateTimeline(events, today);
  return (
    <ol className={`pu-ca-timeline${className ? ` ${className}` : ''}`} aria-label={label} data-testid={testId}>
      {rows.map((e) => {
        const relative = words.relative(e.days);
        return (
          <li key={e.id} className="pu-ca-event" data-phase={e.phase} data-next={e.next ? 'true' : undefined} aria-current={e.next ? 'date' : undefined} data-testid={testId ? `${testId}-${e.id}` : undefined}>
            <span className="pu-ca-mark">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{MARKS[e.phase]}</svg>
            </span>
            <span className="pu-ca-body">
              <span className="pu-ca-label">{e.label ?? kindLabels?.[e.kind] ?? CORPORATE_EVENT_LABELS[e.kind]}</span>
              <DualDate value={e.date} primary={primaryCalendar} language={language} digits={digits} />
              <span className="pu-ca-phase">{words.phase[e.phase]}{relative ? ` · ${relative}` : ''}</span>
              {e.detail && <span className="pu-ca-detail">{e.detail}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
