// The part of a date picker that only exists while it is open. DatePicker.tsx loads it on demand.
import type { RefObject } from 'react';
import { Button } from '../button/Button.tsx';
import { Calendar, type CalendarBaseProps } from '../calendar/Calendar.tsx';
import type { DateRange } from '../calendar/calendarMath.ts';
import type { CalendarLabels } from '../calendar/labels.ts';
import { Popover } from '../popover/Popover.tsx';

export interface DatePickerPanelProps {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLButtonElement | null>;
  positionAnchor: RefObject<HTMLElement | null>;
  label: string;
  id: string;
  host: HTMLElement | undefined;
  touch: boolean;
  calendar: CalendarBaseProps;
  range: boolean;
  draft: string | DateRange | null;
  setDraft: (value: DateRange | null) => void;
  choose: (value: string | null) => void;
  finish: () => void;
  approve: () => void;
  words: CalendarLabels;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
}

export default function DatePickerPanel({ open, onClose, anchor, positionAnchor, label, id, host, touch, calendar, range, draft, setDraft, choose, finish, approve, words, disabled, readOnly, required }: DatePickerPanelProps) {
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} positionAnchor={positionAnchor} label={label} id={id} align="start" portal={host ?? true} width={touch ? 336 : 308} initialFocus='[data-calendar-focus="true"]'>
      {range ? <Calendar {...calendar} mode="range" value={draft as DateRange | null} onChange={setDraft} /> : <Calendar {...calendar} value={typeof draft === 'string' ? draft : null} onChange={choose} />}
      {range && <footer className="pu-date-actions"><Button variant="ghost" size="sm" onClick={finish}>{words.cancel}</Button><Button size="sm" disabled={disabled || readOnly || (draft ? !(draft as DateRange).end : required)} onClick={approve}>{words.apply}</Button></footer>}
    </Popover>
  );
}
