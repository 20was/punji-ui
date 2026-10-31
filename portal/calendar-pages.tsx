import { useState } from 'react';
import { Button, Select } from '@punji/ui';
import { Page, Section, Demo, RefTable } from '@punji/portal-parts';
import { Calendar, type CalendarSystem, type DateRange } from '@punji/package-calendar';
import { DatePicker, DateRangePicker } from '@punji/package-datepicker';
import { getNepalFiscalPeriod, gregorianToBS } from '@punji/package-utilities';
// oxlint-disable-next-line import/no-unassigned-import -- Package token distribution.
import '@punji/package-tokens.css';
// oxlint-disable-next-line import/no-unassigned-import -- New component styles, existing kit controls retain their own CSS.
import '@punji/package-calendar.css';
// oxlint-disable-next-line import/no-unassigned-import -- Existing Field with a trailing calendar action.
import '@punji/package-fields.css';
// oxlint-disable-next-line import/no-unassigned-import -- Calendar uses the package Select, including its desktop picker.
import '@punji/package-select.css';
// oxlint-disable-next-line import/no-unassigned-import -- Shared portal-enabled Popover styles.
import '@punji/package-popover.css';
const TODAY='2026-10-29';
const unavailable=(iso:string)=>['2026-10-15','2026-10-16','2026-10-17'].includes(iso);
const iso=(date:{year:number;month:number;day:number})=>`${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`;
const text=(value:unknown)=>JSON.stringify(value);
function Settings({language,setLanguage,digits,setDigits}:{language:'en'|'ne';setLanguage:(value:'en'|'ne')=>void;digits:'latn'|'deva';setDigits:(value:'latn'|'deva')=>void}) {
  return <div className="ds-stage"><Select label="Language" labelPlacement="above" value={language} onChange={setLanguage} options={[{value:'en',label:'English'},{value:'ne',label:'नेपाली'}]}/><Select label="Digits" labelPlacement="above" value={digits} onChange={setDigits} options={[{value:'latn',label:'Western · 0123'},{value:'deva',label:'Devanagari · ०१२३'}]}/></div>;
}
export function CalendarComponentPage() {
  const fixture=new URLSearchParams(location.search).get('selection');
  const [language,setLanguage]=useState<'en'|'ne'>('en');
  const [digits,setDigits]=useState<'latn'|'deva'>('latn');
  const [system,setSystem]=useState<CalendarSystem>('gregory');
  const [day,setDay]=useState<string|null>(fixture==='empty'?null:TODAY);
  const [range,setRange]=useState<DateRange|null>(fixture==='empty'?null:fixture==='single'?{start:TODAY,end:null}:{start:'2026-10-05',end:'2026-10-12'});
  const [multiple,setMultiple]=useState<string[]>(fixture==='empty'?[]:fixture==='single'?[TODAY]:fixture==='many'?Array.from({length:48},(_,index)=>{const date=new Date(Date.UTC(2026,9,1+index));return date.toISOString().slice(0,10);}):['2026-10-06','2026-10-13','2026-10-20']);
  return <Page path="/components/calendar" lead="An accessible date-only calendar with Gregorian and Bikram Sambat display, direct month/year navigation, range and multiple selection, and explicit availability rules. Stored dates stay Gregorian ISO in every mode.">
    <Section id="examples" title="Working examples"><Settings {...{language,setLanguage,digits,setDigits}}/>
      <Demo ground layout="col" title="Single date · switch AD and BS without changing the stored day" code={"import { Calendar } from '@punji/ui/calendar';\n<Calendar label=\"Transaction date\" value={date} onChange={setDate}\n  calendar={calendar} onCalendarChange={setCalendar}\n  today=\"2026-10-29\" />"}>
        <Calendar label="Single date calendar" value={day} onChange={setDay} calendar={system} onCalendarChange={setSystem} language={language} digits={digits} today={TODAY} defaultMonth={TODAY} min="1900-01-01" max="2100-12-31" testId="docs-calendar-single"/>
        <p>Gregorian ISO value: <output data-testid="docs-calendar-value">{day??'No date selected'}</output></p>
      </Demo>
      <Demo ground layout="col" title="Range selection · 15–17 October are unavailable" code={"<Calendar mode=\"range\" label=\"Reporting period\" value={range}\n  onChange={setRange} isDateUnavailable={isUnavailable} />"}>
        <Calendar label="Range calendar" mode="range" value={range} onChange={setRange} isDateUnavailable={unavailable} language={language} digits={digits} today={TODAY} defaultMonth={TODAY} min="2026-01-01" max="2027-12-31" testId="docs-calendar-range"/>
        <p>Inclusive range: <output>{text(range)}</output></p>
      </Demo>
      <Demo ground layout="col" title="Multiple dates · independent selection" code={"<Calendar mode=\"multiple\" label=\"Payment dates\" value={dates} onChange={setDates} />"}>
        <Calendar label="Multiple dates calendar" mode="multiple" value={multiple} onChange={setMultiple} language={language} digits={digits} today={TODAY} defaultMonth={TODAY} min="2026-01-01" max="2027-12-31" testId="docs-calendar-multiple"/>
        <p><output data-testid="docs-calendar-count">{multiple.length}</output> selected dates.</p>
      </Demo>
      <Demo ground layout="col" title="Outside Nepal · French Gregorian month names, Monday first">
        <Calendar label="French calendar" locale="fr-FR" weekStartsOn={1} value="2026-10-29" onChange={()=>{}} today={TODAY} min="2026-01-01" max="2027-12-31" readOnly/>
      </Demo>
    </Section>
    <Section id="api" title="API reference"><RefTable label="Calendar API" head={['Prop','Contract']} rows={[
      ['mode / value / onChange','single: ISO string or null; range: {start, end|null} or null; multiple: readonly ISO string array. Callbacks return Gregorian ISO values.'],
      ['calendar / onCalendarChange','gregory (default) or bikram-sambat. Provide a callback to show AD/BS controls. Changing display never converts the stored value to a BS string.'],
      ['min / max / isDateUnavailable','Inclusive Gregorian limits and a pure predicate. Unavailable cells remain keyboard-focusable; selection and crossing an unavailable date in a range are blocked.'],
      ['language / locale / digits / labels','English/Nepali built-ins; optional Intl locale for Gregorian month and weekday names; explicit Western/Devanagari digits and overridable control text.'],
      ['weekStartsOn','0 Sunday through 6 Saturday; default Sunday. No exchange-specific weekend or holiday rules.'],
      ['today / defaultMonth','Gregorian ISO dates. Supply today and defaultMonth for deterministic server output. defaultMonth is initial navigation state only.'],
      ['required / disabled / readOnly / bare','Required prevents clearing; disabled prevents interaction; readonly allows browsing without selection; bare composes inside a parent surface.'],
    ].map(([prop,contract])=>[<code className="ds-type" key={prop}>{prop}</code>,contract])}/></Section>
    <Section id="contracts" title="Behaviour and edge cases"><p>Arrow keys move by day/week; Home/End stay within the week; Page Up/Down changes month; Shift changes year. Only one date is a tab stop. Enter or Space selects. Month/year navigation clamps a missing day to the target month’s last day.</p><p>Gregorian dates support years 0001–9999. BS conversion is limited to 1975–2099; out-of-coverage display is explicit. This date-only control does not guess timezones or edit times, recurrences, or every world calendar. Those require separate APIs.</p><p>Selection is controlled. Update value from onChange; a predicate must be fast and deterministic. English and Nepali control copy can be overridden; Nepali wording is pending native editorial review.</p></Section>
  </Page>;
}
export function DatePickerComponentPage() {
  const [language,setLanguage]=useState<'en'|'ne'>('en');const [digits,setDigits]=useState<'latn'|'deva'>('latn');
  const [system,setSystem]=useState<CalendarSystem>('gregory');
  const [appointment,setAppointment]=useState<string|null>(null);const [requiredDate,setRequiredDate]=useState<string|null>(null);const [birthday,setBirthday]=useState<string|null>('1990-04-15');
  const [day,setDay]=useState<string|null>(TODAY);const [range,setRange]=useState<DateRange|null>({start:'2026-10-01',end:TODAY});
  return <Page path="/components/date-picker" lead="Type a date or choose it from a keyboard-accessible calendar popover. Single dates and reporting ranges share strict date-only validation, explicit AD/BS input, and canonical Gregorian values for forms.">
    <Section id="examples" title="Working examples"><Settings {...{language,setLanguage,digits,setDigits}}/>
      <Demo ground layout="col" title="Single date · typed entry and calendar" code={"import { DatePicker } from '@punji/ui/date-picker';\n<DatePicker label=\"Transaction date\" name=\"transactionDate\"\n  value={date} onChange={setDate} today=\"2026-10-29\" />"}>
        <DatePicker label={language==='ne'?'कारोबार मिति':'Transaction date'} name="transactionDate" value={day} onChange={setDay} today={TODAY} calendar={system} onCalendarChange={setSystem} language={language} digits={digits} min="1900-01-01" max="2100-12-31" testId="docs-datepicker"/>
        <p>Stored Gregorian date: <output data-testid="docs-datepicker-value">{day??'No date selected'}</output></p>
      </Demo>
      <Demo ground layout="col" title="Reporting period · apply or cancel a draft" code={"import { DateRangePicker } from '@punji/ui/date-picker';\n<DateRangePicker label=\"Report period\" value={range}\n  onChange={setRange} name=\"period\" />"}>
        <DateRangePicker label="Report period" name="period" value={range} onChange={setRange} today={TODAY} language={language} digits={digits} calendar={system} onCalendarChange={setSystem} min="2020-01-01" max="2035-12-31" testId="docs-daterange"/>
        <div><Button variant="secondary" onClick={()=>{const period=getNepalFiscalPeriod(gregorianToBS({year:2026,month:10,day:29}));setRange({start:iso(period.start.gregorian),end:iso(period.end.gregorian)});}}>Current Nepal fiscal year</Button></div>
        <p>Inclusive Gregorian range: <output data-testid="docs-daterange-value">{text(range)}</output></p>
      </Demo>
      <Demo ground layout="col" title="Constraints, disabled and readonly states">
        <DatePicker testId="docs-appointment" label="Available appointment" value={appointment} onChange={setAppointment} today={TODAY} min="2026-10-01" max="2026-12-31" isDateUnavailable={unavailable} hint="15–17 October cannot be selected."/>
        <DatePicker label="Date of birth" value={birthday} onChange={setBirthday} today={TODAY} max={TODAY} hint="Gregorian · type a year or use the calendar." testId="docs-birthday"/>
        <DatePicker label="Readonly record" value={TODAY} onChange={()=>{}} today={TODAY} readOnly/>
        <DatePicker label="Disabled date" value={null} onChange={()=>{}} today={TODAY} disabled/>
        <DatePicker label="Required date" value={requiredDate} onChange={setRequiredDate} today={TODAY} required error={requiredDate?undefined:"Choose a date before continuing."}/>
      </Demo>
    </Section>
    <Section id="api" title="API reference"><RefTable label="Date picker API" head={['Prop','Contract']} rows={[
      ['DatePicker: value / onChange','Gregorian ISO string or null. Selection commits immediately. Empty optional input clears on blur/Enter.'],
      ['DateRangePicker: value / onChange','{start: Gregorian ISO, end: ISO|null} or null. Popover edits a draft; Apply commits, Cancel/Escape discards. Typed input commits when both endpoints are valid.'],
      ['calendar / language / locale / digits / labels','Same display adapter and localisation controls as Calendar. Input is explicit YYYY-MM-DD in the displayed calendar; accepts Western and Devanagari digits.'],
      ['name','Single hidden field contains canonical Gregorian ISO. Range submits name.start and name.end. Invalid visible input blocks native form validation.'],
      ['min / max / isDateUnavailable / required','Applies to both typing and picking. Invalid input is preserved with an error and never silently normalized to another day.'],
      ['hint / error / disabled / readOnly','Existing Field styling and label associations; error can be controlled by the form. Disabled/readonly triggers cannot open.'],
    ].map(([prop,contract])=>[<code className="ds-type" key={prop}>{prop}</code>,contract])}/></Section>
    <Section id="contracts" title="Behaviour and edge cases"><p>Alt+Down opens the popover from the input. Escape restores trigger focus. Click outside or Tab onwards to dismiss; the page stays usable without a backdrop or scroll lock. The shared Popover floats above clipping containers and follows scrolling. Touch controls stay usable on phones and the panel scrolls within a short viewport.</p><p>All values are date-only strings, not Date objects or timestamps. Native form fields submit Gregorian values regardless of display. Client validation is a convenience; applications must validate submitted values on their server.</p><p>When importing component CSS individually include tokens, base, button, select, fields, popover and calendar CSS. The aggregate styles.css includes all of them. No package was added.</p></Section>
  </Page>;
}
export function PackageRoadmapPage() {
  return <Page path="/get-started/roadmap" lead="The next product features, with live documentation and honest delivery status. The calendar and date picker are the first focus for a Nepal-first, reusable financial framework.">
    <Section id="shipped" title="Available in this checkout"><p>Financial formatters, exact money, date-only utilities, BS conversion, fiscal periods and reusable hooks have package exports, tests and working portal examples. The package remains pre-release.</p></Section>
    <Section id="next" title="1. Date picker and calendar"><h3>Local preview · ready for owner review</h3><p>Gregorian and Bikram Sambat display, typed dates, date ranges, multiple selection, year/month shortcuts, unavailable dates and keyboard navigation.</p><ul><li><a href="/components/date-picker">Open Date picker and DateRangePicker examples</a></li><li><a href="/components/calendar">Open Calendar examples and API</a></li></ul><p>Remaining release work includes native Nepali copy review and assistive-technology testing. Time, timezone-aware appointments, recurrence and additional world calendars are separate future features.</p></Section>
    <Section id="later" title="Later"><ol><li>Advanced data tables and filters.</li><li>Financial form compositions and accounting workflows.</li><li>Time fields, timezone-aware scheduling and additional calendar adapters.</li></ol></Section>
  </Page>;
}
