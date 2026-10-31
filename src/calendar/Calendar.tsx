'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '../button/Button.tsx';
import { Field } from '../fields/Fields.tsx';
import { Select } from '../select/Select.tsx';
import { BS_MONTHS, type NepalLanguage } from '../nepal/locale.ts';
import { instantToNepalDate } from '../nepal/calendar.ts';
import { calendarLimits, dayNumber, displayParts, fromDayNumber, isoDate, monthLength, nextRange, rangeAvailable, requireISO, shiftMonth, storageDate, type CalendarSystem, type DateRange } from './calendarMath.ts';
import { calendarLabels, gregorianMonths, weekDays, type CalendarLabels } from './labels.ts';
export type { CalendarSystem, DateRange, CalendarLabels };

export interface CalendarBaseProps {
  /** Names the calendar for screen readers. */
  label: string;
  /** The calendar system shown: 'gregory' (default) or 'bikram-sambat'. */
  calendar?: CalendarSystem;
  /** Called when the user picks the other calendar system. Without it, only the current name is shown. */
  onCalendarChange?: (calendar: CalendarSystem) => void;
  /** Language of the built-in words: 'en' (default) or 'ne'. */
  language?: NepalLanguage;
  /** Intl locale for Gregorian month/weekday names; override labels for translated controls. */
  locale?: string;
  /** Digits shown: 'latn' (default) or Devanagari 'deva'. */
  digits?: 'latn' | 'deva';
  /** Overrides for the built-in words, merged over the language's defaults. */
  labels?: Partial<CalendarLabels>;
  /** Sunday = 0 ... Saturday = 6. Default Sunday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Earliest selectable ISO date (YYYY-MM-DD). Cannot go before the calendar's supported range. */
  min?: string;
  /** Latest selectable ISO date (YYYY-MM-DD). Cannot go past the calendar's supported range. */
  max?: string;
  /** Returns true for an ISO date that cannot be picked. */
  isDateUnavailable?: (iso: string) => boolean;
  /** Disables every date and button. */
  disabled?: boolean;
  /** Shows the value but blocks changes. */
  readOnly?: boolean;
  /** Required: the clear button is disabled. */
  required?: boolean;
  /** Gregorian ISO day used for the today marker/button. Pass explicitly for deterministic SSR. */
  today?: string;
  /** The month shown when there is no value, as an ISO date (kept within min and max). */
  defaultMonth?: string;
  autoFocus?: boolean;
  /** Remove its surface when composing inside an existing panel. */
  bare?: boolean;
  /** Test id on the root element. */
  testId?: string;
}
export type CalendarProps = CalendarBaseProps & (
  | {mode?: 'single'; value: string | null; onChange: (value: string | null) => void}
  | {mode: 'range'; value: DateRange | null; onChange: (value: DateRange | null) => void}
  | {mode: 'multiple'; value: readonly string[]; onChange: (value: string[]) => void}
);
const firstValue = (props: CalendarProps): string | null => props.mode === 'range' ? props.value?.start ?? null : props.mode === 'multiple' ? props.value[0] ?? null : props.value;
const Arrow = ({next}: {next?:boolean}) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={next?'m9 6 6 6-6 6':'m15 6-6 6 6 6'}/></svg>;

function YearInput({year,min,max,label,invalid,disabled,number,onChange}:{year:number;min:number;max:number;label:string;invalid:string;disabled:boolean;number:Intl.NumberFormat;onChange:(year:number)=>void}) {
  const [edit,setEdit]=useState<{year:number;text:string;invalid:boolean}|null>(null);
  const text=edit?.year===year?edit.text:number.format(year);
  const commit=()=>{
    const normalized=text.replace(/[०-९]/g,digit=>String('०१२३४५६७८९'.indexOf(digit)));
    const value=Number(normalized);
    if(!/^\d{1,4}$/.test(normalized)||value<min||value>max){setEdit({year,text,invalid:true});return;}
    setEdit(null);onChange(value);
  };
  return <Field style={{paddingInline:4,background:'transparent',borderColor:'transparent'}} label={label} hideLabel size="md" value={text} onChange={value=>setEdit({year,text:value,invalid:false})} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}} error={edit?.year===year&&edit.invalid?invalid.replace('{min}',number.format(min)).replace('{max}',number.format(max)):undefined} inputMode="numeric" maxLength={4} disabled={disabled}/>;
}

export function Calendar(props: CalendarProps) {
  const {calendar='gregory',language='en',digits='latn',weekStartsOn=0,disabled=false,readOnly=false,required=false,autoFocus=false,bare=false} = props;
  const words = {...calendarLabels[language],...props.labels};
  if(props.min)requireISO(props.min);
  if(props.max)requireISO(props.max);
  if(props.defaultMonth)requireISO(props.defaultMonth);
  const values=props.mode==='multiple'?props.value:props.mode==='range'?[props.value?.start,props.value?.end]:[props.value];
  for(const value of values)if(value)requireISO(value);
  if(props.mode==='range'&&props.value?.end&&props.value.start>props.value.end)throw new RangeError('Range start must not follow end');
  const limits = calendarLimits(calendar);
  const min = props.min && props.min > limits.min ? props.min : limits.min;
  const max = props.max && props.max < limits.max ? props.max : limits.max;
  requireISO(min); requireISO(max);
  if (min > max) throw new RangeError('Calendar minimum must not follow maximum or exceed supported coverage');
  const [mountedToday] = useState(()=>isoDate(instantToNepalDate(new Date())));
  const today = props.today ?? mountedToday;
  requireISO(today);
  const clamp = (iso:string) => iso < min ? min : iso > max ? max : iso;
  const initial = clamp(firstValue(props) ?? props.defaultMonth ?? today);
  const selectedStart=props.mode==='multiple'?null:firstValue(props);
  const [navigation,setNavigation]=useState({selection:selectedStart,day:initial});
  let focused=navigation.day;
  if(navigation.selection!==selectedStart){focused=selectedStart?clamp(selectedStart):navigation.day;setNavigation({selection:selectedStart,day:focused});}
  const setFocused=(day:string)=>setNavigation(previous=>previous.day===day&&previous.selection===selectedStart?previous:{selection:selectedStart,day});
  const [hovered,setHovered]=useState<string|null>(null);
  const [message,setMessage] = useState('');
  const focusDay = clamp(focused);
  const shown = displayParts(focusDay,calendar);
  const first = storageDate({...shown,day:1},calendar);
  const count = monthLength(shown.year,shown.month,calendar);
  const weekday = ((dayNumber(first) + 4) % 7 + 7) % 7;
  const offset = (weekday - weekStartsOn + 7) % 7;
  const start = dayNumber(first) - offset;
  const grid = useRef<HTMLTableElement>(null);
  useEffect(()=>{if(autoFocus)grid.current?.querySelector<HTMLButtonElement>('[data-calendar-focus="true"]')?.focus({preventScroll:true});},[autoFocus]);
  const heading = useId(), helpId=useId();
  const number = new Intl.NumberFormat('en-IN',{numberingSystem:digits,useGrouping:false});
  const months = calendar === 'gregory' ? props.locale ? Array.from({length:12},(_month,index)=>new Intl.DateTimeFormat(props.locale,{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2020,index,1)))) : gregorianMonths[language] : BS_MONTHS[language];
  const weekdays = props.locale ? Array.from({length:7},(_day,index)=>new Intl.DateTimeFormat(props.locale,{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2020,5,7+index)))) : weekDays[language];
  const title = `${months[shown.month-1]} ${number.format(shown.year)}`;
  const minYear = displayParts(min,calendar).year, maxYear = displayParts(max,calendar).year;
  const blocked = (day:string) => day < min || day > max || !!props.isDateUnavailable?.(day);
  const selected = (day:string) => props.mode === 'range' ? !!props.value && day >= props.value.start && day <= (props.value.end ?? props.value.start) : props.mode === 'multiple' ? props.value.includes(day) : props.value === day;
  const preview=!disabled&&!readOnly&&props.mode==='range'&&props.value&&!props.value.end&&(hovered??focusDay)!==props.value.start?nextRange(props.value,hovered??focusDay):null;
  const select = (day:string) => {
    if (disabled || readOnly || blocked(day)) return;
    setMessage('');setHovered(null);
    if (props.mode === 'range') {
      const next = nextRange(props.value,day);
      if (next.end && !rangeAvailable(next.start,next.end,props.isDateUnavailable)) {setMessage(words.unavailableRange);return;}
      props.onChange(next);
    } else if (props.mode === 'multiple') {
      if (required && props.value.length === 1 && props.value.includes(day)) return;
      props.onChange(props.value.includes(day) ? props.value.filter(item=>item!==day) : [...props.value,day].toSorted());
    } else props.onChange(day);
  };
  const moveFocus = (day:string | null, restore=true) => {
    if (!day) return;
    const next=clamp(day), previous=document.activeElement;setFocused(next);
    if (restore) requestAnimationFrame(()=>{if(document.activeElement===previous||document.activeElement===document.body)grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();});
  };
  const key = (event:KeyboardEvent<HTMLButtonElement>,day:string) => {
    let next:string | null=null;
    const position=((dayNumber(day)+4)%7+7-weekStartsOn)%7;
    const delta:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-position,End:6-position};
    if (event.key in delta) {
      try {next=fromDayNumber(dayNumber(day)+delta[event.key]!);} catch {next=day;}
    } else if(event.key==='PageUp'||event.key==='PageDown') next=shiftMonth(day,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1),calendar);
    else return;
    event.preventDefault();moveFocus(next);
  };
  const navigate = (delta:number) => moveFocus(shiftMonth(focusDay,delta,calendar),false);
  const adjacent = (delta:number) => {const day=shiftMonth(first,delta,calendar);if(!day)return false;const part=displayParts(day,calendar);const end=storageDate({...part,day:monthLength(part.year,part.month,calendar)},calendar);return day<=max && end>=min;};
  const chooseMonth = (year:number,month:number) => {
    try {moveFocus(storageDate({year,month,day:Math.min(shown.day,monthLength(year,month,calendar))},calendar),false);} catch { /* Unsupported boundary month stays on the current month. */ }
  };
  const clear = () => {if (props.mode==='multiple') props.onChange([]);else if(props.mode==='range')props.onChange(null);else props.onChange(null);};
  return <section className={`pu-calendar${bare?' bare':''}`} aria-label={props.label} data-testid={props.testId} data-disabled={disabled||undefined}>
    <h3 id={heading} className="kit-sr" aria-live="polite" aria-atomic="true">{title}</h3>
    <header className="pu-cal-heading">
      <Button iconOnly label={words.previousMonth} variant="ghost" size="md" disabled={disabled||!adjacent(-1)} onClick={()=>navigate(-1)}><Arrow/></Button>
      <div className="pu-cal-caption"><Select label={words.month} bare size="sm" value={String(shown.month)} onChange={month=>chooseMonth(shown.year,Number(month))} disabled={disabled} options={months.map((month,index)=>({value:String(index+1),label:month,disabled:shown.year===minYear&&index+1<displayParts(min,calendar).month||shown.year===maxYear&&index+1>displayParts(max,calendar).month}))}/><YearInput label={words.year} invalid={words.invalidYear} year={shown.year} min={minYear} max={maxYear} disabled={disabled} number={number} onChange={year=>chooseMonth(year,shown.month)}/></div>
      <Button iconOnly label={words.nextMonth} variant="ghost" size="md" disabled={disabled||!adjacent(1)} onClick={()=>navigate(1)}><Arrow next/></Button>
    </header>
    <table ref={grid} className="pu-cal-grid" role="grid" aria-labelledby={heading} aria-describedby={helpId} onMouseLeave={()=>setHovered(null)} aria-multiselectable={props.mode==='range'||props.mode==='multiple'||undefined} aria-readonly={readOnly||undefined}>
      <thead><tr>{Array.from({length:7},(_,index)=>(index+weekStartsOn)%7).map(day=><th key={day} scope="col" abbr={weekdays[day]}>{props.locale?new Intl.DateTimeFormat(props.locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2020,5,7+day))):language==='ne'?weekDays.ne[day]!.replace(/बार$/,''):weekDays.en[day]!.slice(0,2)}</th>)}</tr></thead>
      <tbody>{Array.from({length:Math.ceil((offset+count)/7)},(_,week)=><tr key={week}>{Array.from({length:7},(_cell,index)=>{
        const ordinal=start+week*7+index;
        let day:string;try{day=fromDayNumber(ordinal);}catch{return <td key={index} aria-hidden="true"/>;}
        if(day<limits.min||day>limits.max)return <td key={index} aria-hidden="true"/>;
        const outside=ordinal<dayNumber(first)||ordinal>=dayNumber(first)+count;
        const unavailable=blocked(day), isSelected=selected(day), edge=props.mode!=='range'||day===props.value?.start||day===props.value?.end;
        const display=displayParts(day,calendar);
        const name=`${weekdays[((ordinal+4)%7+7)%7]}, ${number.format(display.day)} ${months[display.month-1]} ${number.format(display.year)} ${calendar==='gregory'?words.gregorian:words.bikramSambat}`;
        return <td key={index} aria-selected={isSelected} aria-disabled={disabled||unavailable||undefined} className={`${outside?'outside ':''}${props.mode==='range'&&props.value?.end&&isSelected?`${day===props.value.start?'range-start ':''}${day===props.value.end?'range-end ':''}${!edge?'range-middle ':''}`:''}${isSelected?'selected ':''}${isSelected&&edge?'edge ':''}${preview?.end&&day>=preview.start&&day<=preview.end&&!isSelected?'preview ':''}${day===today?'today':''}`}><button type="button" data-date={day} data-calendar-focus={day===focusDay?'true':undefined} tabIndex={!disabled&&day===focusDay?0:-1} aria-label={name} aria-current={day===today?'date':undefined} aria-disabled={disabled||unavailable||readOnly||undefined} data-unavailable={unavailable||undefined} disabled={disabled} onMouseEnter={()=>{if(props.mode==='range'&&props.value&&!props.value.end)setHovered(day);}} onFocus={()=>{if(!outside)setFocused(day);}} onKeyDown={event=>key(event,day)} onClick={()=>{if(outside)moveFocus(day);select(day);}}>{number.format(display.day)}</button></td>;
      })}</tr>)}</tbody>
    </table>
    <footer className="pu-cal-footer">
      <Button variant="ghost" size="sm" disabled={disabled||today<min||today>max} onClick={()=>moveFocus(today)}>{words.today}</Button>
      {props.onCalendarChange ? <div className="pu-cal-systems" role="group" aria-label={language==='ne'?'पात्रो':'Calendar system'}>{(['gregory','bikram-sambat'] as const).map(system=><Button key={system} size="sm" variant={calendar===system?'secondary':'ghost'} aria-pressed={calendar===system} disabled={disabled} onClick={()=>props.onCalendarChange?.(system)}>{system==='gregory'?words.gregorian:words.bikramSambat}</Button>)}</div> : <span className="pu-cal-system-name">{calendar==='gregory'?words.gregorian:words.bikramSambat}</span>}
      <Button variant="ghost" size="sm" disabled={disabled||readOnly||required} onClick={clear}>{words.clear}</Button>
    </footer>
    <p id={helpId} className="kit-sr">{props.mode==='range'&&!props.value?.end?words.rangeHint:words.help}</p>
    <span role="status" className={message?'pu-cal-error':'kit-sr'}>{message}</span>
  </section>;
}
