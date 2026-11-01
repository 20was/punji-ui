'use client';

import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useMediaQuery } from '../use-media-query/useMediaQuery.ts';
import { Field } from '../fields/Fields.tsx';
import { Button } from '../button/Button.tsx';
import type { CalendarBaseProps } from '../calendar/Calendar.tsx';
import type DatePickerPanel from './DatePickerPanel.tsx';
import { calendarLimits, displayParts, isoDate, parseDateInput, rangeAvailable, requireISO, type DateRange } from '../calendar/calendarMath.ts';
import { calendarLabels } from '../calendar/labels.ts';
import { useLocaleMessages } from '../locale/context.tsx';
import type { DateRangePreset } from '../date-range-presets/presets.ts';
export { DateRangePresetList, type DateRangePresetListProps } from './DateRangePresetList.tsx';

// The popover, the calendar grid and the range footer exist only while the picker is open, so they are their own
// chunk. The typed fields and the trigger load with the picker; the panel loads on the first hover or focus (or the
// first open). Once loaded it renders synchronously, so a second open never waits.
type PanelComponent = typeof DatePickerPanel;
let loadedPanel: PanelComponent | undefined;
const loadPanel = () => import('./DatePickerPanel.tsx').then((m) => (loadedPanel = m.default));
const LazyPanel = lazy(() => loadPanel().then((component) => ({ default: component })));

export interface DatePickerBaseProps extends Omit<CalendarBaseProps, 'bare' | 'autoFocus'> {
  /** Id of the input; generated when omitted. */
  id?: string;
  /** Form field name. The value is submitted in a hidden input (`name.start` and `name.end` for a range). */
  name?: string;
  /** Help text under the field. The format hint is shown when omitted. */
  hint?: string;
  /** Error text under the field. It replaces the hint. */
  error?: string;
}
export interface DatePickerProps extends DatePickerBaseProps {
  /** The selected ISO date (YYYY-MM-DD), or null for none. */
  value: string | null;
  /** Called with the new ISO date, or null when cleared, once a pick or typed entry is accepted. */
  onChange: (value: string | null) => void;
}
export interface DateRangePickerProps extends DatePickerBaseProps {
  /** The selected range as ISO start and end dates, or null for none. */
  value: DateRange | null;
  /** Called with the applied range, or null when cleared. */
  onChange: (value: DateRange | null) => void;
  /** Quick ranges shown above the calendar (build them with `dateRangePresets` or `nepalDateRangePresets`). Choosing one applies it at once and closes the popover; one that touches an unavailable or out-of-bounds day is disabled. */
  presets?: readonly DateRangePreset[];
}
type PickerProps = (DatePickerProps & {range?:false}) | (DateRangePickerProps & {range:true});
const CalendarIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>;

function Picker(props:PickerProps) {
  const {calendar='gregory',language='en',digits='latn',disabled=false,readOnly=false,required=false} = props;
  const words={...calendarLabels[language],...useLocaleMessages().messages.calendar,...props.labels};
  const auto=useId(), id=props.id??auto, panelId=`${id}-calendar`;
  const root=useRef<HTMLDivElement>(null), anchor=useRef<HTMLButtonElement>(null);
  const positionAnchor=useRef<HTMLElement|null>(null);
  const [open,setOpen]=useState(false);
  // Once opened the panel stays mounted (closed), as the popover did.
  const [everOpened,setEverOpened]=useState(false);
  const [host,setHost]=useState<HTMLElement>();
  const touch=useMediaQuery('(max-width: 640px), (pointer: coarse)');
  const [draft,setDraft]=useState<string | DateRange | null>(props.value);
  const [typed,setTyped]=useState<{source:string;start:string;end:string;checked:boolean}|null>(null);
  const valueStart=props.range?props.value?.start??'':props.value??'';
  const valueEnd=props.range?props.value?.end??'':'';
  if(valueStart)requireISO(valueStart);
  if(valueEnd)requireISO(valueEnd);
  if(props.min)requireISO(props.min);
  if(props.max)requireISO(props.max);
  if(props.min&&props.max&&props.min>props.max)throw new RangeError('Date picker minimum must not follow maximum');
  const source=`${calendar}:${digits}:${valueStart}:${valueEnd}`;
  const display=(value:string) => {
    if(!value)return '';
    try {
      const text=isoDate(displayParts(value,calendar));
      return digits==='deva'?text.replace(/\d/g,digit=>'०१२३४५६७८९'[Number(digit)]!):text;
    } catch {return '';}
  };
  const startText=typed?.source===source?typed.start:display(valueStart);
  const endText=typed?.source===source?typed.end:display(valueEnd);
  const limits=calendarLimits(calendar);
  const unavailable=(day:string)=>day<(props.min??limits.min)||day>(props.max??limits.max)||day<limits.min||day>limits.max||!!props.isDateUnavailable?.(day);
  const parse=()=>{
    if(typed?.source!==source&&(valueStart&&!display(valueStart)||valueEnd&&!display(valueEnd)))return {value:null,error:words.outsideCoverage};
    if(!startText && !endText)return {value:null,error:required?words.required:''};
    const start=parseDateInput(startText,calendar), end=props.range?parseDateInput(endText,calendar):null;
    if(!start || props.range&&!end)return {value:null,error:words.invalidDate};
    if(unavailable(start)||end&&unavailable(end))return {value:null,error:words.unavailable};
    if(props.range && end && (start>end || !rangeAvailable(start,end,props.isDateUnavailable)))return {value:null,error:words.unavailableRange};
    return {value:props.range?{start,end}:start,error:''};
  };
  const result=parse();
  const error=props.error || (result.error===words.outsideCoverage?result.error:'') || (typed?.source===source&&typed.checked?result.error:'');
  const parsedStart=parseDateInput(startText,calendar);
  const startInvalid=!props.range||!parsedStart||unavailable(parsedStart);
  const nativeError=props.error||result.error;
  const changeText=(part:'start'|'end',text:string)=>setTyped({source,start:startText,end:endText,checked:false,[part]:text});
  const commit=()=>{
    if(disabled||readOnly)return;
    setTyped({source,start:startText,end:endText,checked:true});
    if(result.error)return;
    if(props.range)props.onChange(result.value as DateRange|null);else props.onChange(result.value as string|null);
  };
  // Native form validation must reject semantic errors, not only malformed text.
  useEffect(()=>{
    for(const input of root.current?.querySelectorAll<HTMLInputElement>('.pu-date-fields input')??[]) input.setCustomValidity(input.id===id?(startInvalid?nativeError:''):nativeError);
  },[id,nativeError,startInvalid]);
  const begin=()=>{if(disabled||readOnly)return;positionAnchor.current=root.current?.querySelector<HTMLElement>('.kit-field-control')??null;setHost(root.current?.closest('dialog')??document.body);setDraft(props.value);setEverOpened(true);setOpen(true);};
  const finish=()=>{setOpen(false);anchor.current?.focus({preventScroll:true});};
  const choose=(value:string|null)=>{if(props.range||disabled||readOnly)return;props.onChange(value);setTyped(null);finish();};
  const approve=()=>{if(!props.range||disabled||readOnly)return;const range=draft as DateRange|null;if(range?!range.end:required)return;props.onChange(range);setTyped(null);finish();};
  const presetOk=(range:{start:string;end:string})=>!unavailable(range.start)&&!unavailable(range.end)&&rangeAvailable(range.start,range.end,props.isDateUnavailable);
  const choosePreset=(range:{start:string;end:string})=>{if(!props.range||disabled||readOnly||!presetOk(range))return;props.onChange({start:range.start,end:range.end});setTyped(null);finish();};
  const base:CalendarBaseProps={label:props.label,calendar,onCalendarChange:props.onCalendarChange,locale:props.locale,language,digits,labels:props.labels,weekStartsOn:props.weekStartsOn,min:props.min,max:props.max,isDateUnavailable:props.isDateUnavailable,today:props.today,defaultMonth:props.defaultMonth,required,disabled,readOnly,bare:true,autoFocus:true};
  return <div className="pu-date-picker" ref={root} data-testid={props.testId} onPointerEnter={()=>{void loadPanel();}} onFocus={()=>{void loadPanel();}}>
    <div className="pu-date-controls"><div className={`pu-date-fields${props.range?' range':''}`}>
      <Field trailingAction={<Button ref={anchor} iconOnly label={`${props.range?words.chooseRange:words.chooseDate}: ${props.label}${valueStart?`, ${display(valueStart)}`:''}`} variant="ghost" size="lg" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?panelId:undefined} disabled={disabled||readOnly} onClick={begin} testId={props.testId?`${props.testId}-trigger`:undefined}><CalendarIcon/></Button>} id={id} label={props.range?`${props.label} · ${words.startDate}`:props.label} value={startText} onChange={text=>changeText('start',text)} onBlur={event=>{if(props.range&&event.relatedTarget instanceof Node&&root.current?.contains(event.relatedTarget))return;commit();}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}else if(event.key==='ArrowDown'&&event.altKey){event.preventDefault();begin();}}} disabled={disabled} readOnly={readOnly} required={required} placeholder={words.formatHint} hint={props.hint??`${words.formatHint} · ${calendar==='gregory'?words.gregorian:words.bikramSambat}`} error={startInvalid?error||undefined:undefined} maxLength={10} autoComplete="off" inputMode="text" testId={props.testId?`${props.testId}-input`:undefined}/>
      {props.range&&<Field id={`${id}-end`} label={words.endDate} value={endText} onChange={text=>changeText('end',text)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}} disabled={disabled} readOnly={readOnly} required={required} placeholder={words.formatHint} error={!startInvalid?error||undefined:undefined} hint={`${words.formatHint} · ${calendar==='gregory'?words.gregorian:words.bikramSambat}`} maxLength={10} autoComplete="off" inputMode="text" testId={props.testId?`${props.testId}-end-input`:undefined}/>}
    </div></div>
    {props.name&&(props.range?<><input type="hidden" name={`${props.name}.start`} value={valueStart} disabled={disabled}/><input type="hidden" name={`${props.name}.end`} value={valueEnd} disabled={disabled}/></>:<input type="hidden" name={props.name} value={valueStart} disabled={disabled}/>)}
    {(open||everOpened)&&(()=>{
      const Panel=loadedPanel??LazyPanel;
      return <Suspense fallback={null}><Panel open={open} onClose={()=>setOpen(false)} anchor={anchor} positionAnchor={positionAnchor} label={props.label} id={panelId} host={host} touch={touch} calendar={base} presets={props.range?props.presets:undefined} presetOk={presetOk} choosePreset={choosePreset} range={!!props.range} draft={draft} setDraft={setDraft} choose={choose} finish={finish} approve={approve} words={words} disabled={disabled} readOnly={readOnly} required={required}/></Suspense>;
    })()}
  </div>;
}
export function DatePicker(props:DatePickerProps) {return <Picker {...props}/>;}
export function DateRangePicker(props:DateRangePickerProps) {return <Picker {...props} range/>;}
