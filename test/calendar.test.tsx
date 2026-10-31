import { useState } from 'react';
import { userEvent } from '@testing-library/user-event';
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Calendar } from '../src/calendar/Calendar.tsx';
import { DatePicker, DateRangePicker } from '../src/date-picker/DatePicker.tsx';
import { monthLength, shiftMonth, parseDateInput, calendarLimits, dayNumber, fromDayNumber } from '../src/calendar/calendarMath.ts';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { seriousViolations } from './axe.ts';
const TODAY='2026-10-29';
afterEach(cleanup);
const cell=(container:HTMLElement,date:string)=>container.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)!;
function RangeExample() {const [value,setValue]=useState<{start:string;end:string|null}|null>(null);return <Calendar label="Range" mode="range" value={value} onChange={setValue} today={TODAY} defaultMonth={TODAY} min="2026-01-01" max="2027-12-31" isDateUnavailable={date=>date==='2026-10-15'}/>;}
describe('calendar math',()=>{
  it('validates Gregorian and BS month navigation without rollover',()=>{
    expect(monthLength(2024,2,'gregory')).toBe(29);
    expect(monthLength(1900,2,'gregory')).toBe(28);
    expect(monthLength(2080,1,'bikram-sambat')).toBe(31);
    expect(shiftMonth('2024-03-31',-1,'gregory')).toBe('2024-02-29');
    expect(shiftMonth('0001-01-01',-1,'gregory')).toBeNull();
    expect(shiftMonth('9999-12-31',1,'gregory')).toBeNull();
    expect(parseDateInput('२०८०-०१-१५','bikram-sambat')).toBe('2023-04-28');
    expect(parseDateInput('2080-01-32','bikram-sambat')).toBeNull();
    expect(parseDateInput('2023-02-29','gregory')).toBeNull();
    for(const date of ['0001-01-01','0099-02-28','2024-02-29','9999-12-31'])expect(fromDayNumber(dayNumber(date))).toBe(date);
    expect(calendarLimits('bikram-sambat')).toEqual({min:'1918-04-13',max:'2043-04-13'});
  });
});
describe('Calendar',()=>{
  it('has a single grid tab stop, real selected state and no serious axe violations',async()=>{
    const {container}=render(<Calendar label="Choose a day" value={TODAY} onChange={()=>{}} today={TODAY}/>);
    expect(container.querySelectorAll('table button[tabindex="0"]').length).toBe(1);
    expect(cell(container,TODAY).closest('td')!.getAttribute('aria-selected')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('selects the adjacent-month day clicked without changing it during pointer focus',async()=>{
    const change=vi.fn<(value:string|null)=>void>();
    const {container}=render(<Calendar label="Adjacent days" value={TODAY} onChange={change} today={TODAY}/>);
    await userEvent.setup().click(cell(container,'2026-09-27'));
    expect(change).toHaveBeenCalledWith('2026-09-27');
    expect(screen.getByRole('heading').textContent).toBe('September 2026');
  });
  it('moves keyboard focus across months and clamps leap days',async()=>{
    const {container}=render(<Calendar label="Keyboard calendar" value="2024-03-31" onChange={()=>{}} today="2024-03-31"/>);
    fireEvent.keyDown(cell(container,'2024-03-31'),{key:'PageUp'});
    await waitFor(()=>expect(document.activeElement).toBe(cell(container,'2024-02-29')));
    fireEvent.keyDown(cell(container,'2024-02-29'),{key:'PageUp',shiftKey:true});
    await waitFor(()=>expect(document.activeElement).toBe(cell(container,'2023-02-28')));
    fireEvent.keyDown(cell(container,'2023-02-28'),{key:'ArrowRight'});
    await waitFor(()=>expect(document.activeElement).toBe(cell(container,'2023-03-01')));
  });
  it('does not steal focus from year entry while a grid focus request is pending',async()=>{
    const {container}=render(<Calendar label="Fast navigation" value={TODAY} onChange={()=>{}} today={TODAY}/>);
    cell(container,TODAY).focus();fireEvent.keyDown(cell(container,TODAY),{key:'PageDown'});
    const year=screen.getByLabelText('Year');year.focus();
    await act(async()=>{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));});
    expect(document.activeElement).toBe(year);
  });
  it('blocks unavailable dates and ranges across them without losing the draft',()=>{
    const {container}=render(<RangeExample/>);
    fireEvent.click(cell(container,'2026-10-10'));
    fireEvent.click(cell(container,'2026-10-20'));
    expect(screen.getByRole('status').textContent).toContain('unavailable');
    expect(cell(container,'2026-10-10').closest('td')!.getAttribute('aria-selected')).toBe('true');
    expect(cell(container,'2026-10-20').closest('td')!.getAttribute('aria-selected')).toBe('false');
    fireEvent.click(cell(container,'2026-10-12'));
    expect(cell(container,'2026-10-11').closest('td')!.getAttribute('aria-selected')).toBe('true');
  });
  it('handles multiple selection and required/readonly/disabled rules',()=>{
    const change=vi.fn<(dates:string[])=>void>();
    const {container,rerender}=render(<Calendar label="Multiple" mode="multiple" value={[TODAY]} onChange={change} today={TODAY} required/>);
    fireEvent.click(cell(container,TODAY));expect(change).not.toHaveBeenCalled();
    fireEvent.click(cell(container,'2026-10-28'));expect(change).toHaveBeenCalledWith(['2026-10-28',TODAY]);
    change.mockClear();rerender(<Calendar label="Multiple" mode="multiple" value={[TODAY]} onChange={change} today={TODAY} readOnly/>);
    fireEvent.click(cell(container,'2026-10-28'));expect(change).not.toHaveBeenCalled();
    rerender(<Calendar label="Multiple" mode="multiple" value={[TODAY]} onChange={change} today={TODAY} disabled/>);
    expect(cell(container,TODAY).disabled).toBe(true);
  });
  it('keeps BS selection in Gregorian storage and supports direct year entry',()=>{
    const change=vi.fn<(value:string|null)=>void>();
    const {container}=render(<Calendar label="Nepali calendar" calendar="bikram-sambat" language="ne" digits="deva" value="2024-04-13" onChange={change} today="2024-04-13"/>);
    expect(screen.getByRole('heading').textContent).toContain('वैशाख');
    fireEvent.click(cell(container,'2024-04-14'));expect(change).toHaveBeenCalledWith('2024-04-14');
    const year=screen.getByLabelText('वर्ष');fireEvent.change(year,{target:{value:'2080'}});fireEvent.blur(year);
    expect(screen.getByRole('heading').textContent).toContain('२०८०');
  });
  it('follows controlled single-date resets without trapping multiple selection focus',()=>{
    const {container,rerender}=render(<Calendar label="Controlled" value="2026-10-29" onChange={()=>{}} today={TODAY}/>);
    rerender(<Calendar label="Controlled" value="2027-02-28" onChange={()=>{}} today={TODAY}/>);
    expect(cell(container,'2027-02-28').getAttribute('tabindex')).toBe('0');
  });
  it('hydrates deterministically when the reference day is supplied',async()=>{
    const component=<Calendar label="SSR calendar" value={null} onChange={()=>{}} today={TODAY} defaultMonth={TODAY}/>;
    const container=document.createElement('div');container.innerHTML=renderToString(component);document.body.append(container);
    const recoverable=vi.fn<(error:unknown)=>void>();
    let root:ReturnType<typeof hydrateRoot>|undefined;
    await act(async()=>{root=hydrateRoot(container,component,{onRecoverableError:recoverable});});
    expect(recoverable).not.toHaveBeenCalled();
    await act(async()=>root!.unmount());container.remove();
  });
  it('rejects invalid configuration and renders true Gregorian edge years',()=>{
    expect(()=>render(<Calendar label="Invalid" value={null} onChange={()=>{}} min="2026-12-01" max="2026-01-01" today={TODAY}/>)).toThrow(/minimum/);
    const {container}=render(<Calendar label="Early dates" value="0001-01-01" onChange={()=>{}} today="0001-01-01"/>);
    expect(cell(container,'0001-01-01')).toBeTruthy();
    expect((screen.getByRole('button',{name:'Previous month'}) as HTMLButtonElement).disabled).toBe(true);
  });
});
describe('DatePicker and DateRangePicker',()=>{
  it('validates typed dates and submits Gregorian ISO behind BS input',()=>{
    const change=vi.fn<(value:string|null)=>void>();
    const {container}=render(<DatePicker label="Record date" name="recordDate" value={null} onChange={change} calendar="bikram-sambat" today={TODAY}/>);
    const input=screen.getByLabelText('Record date');
    fireEvent.change(input,{target:{value:'2080-01-32'}});fireEvent.blur(input);expect(change).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(input,{target:{value:'२०८०-०१-१५'}});fireEvent.blur(input);expect(change).toHaveBeenCalledWith('2023-04-28');
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')!.name).toBe('recordDate');
  });
  it('opens a named dialog, focuses the selected date, and restores focus on cancel',async()=>{
    const {container}=render(<DatePicker label="Date" value={TODAY} onChange={()=>{}} today={TODAY}/>);
    const trigger=screen.getByRole('button',{name:/Choose date/});fireEvent.click(trigger);
    const dialog=screen.getByRole('dialog',{name:'Date'});
    expect(document.activeElement).toBe(cell(dialog,TODAY));
    expect(await seriousViolations(dialog)).toEqual([]);
    fireEvent.keyDown(dialog,{key:'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(container.querySelector('input')!.value).toBe(TODAY);
  });
  it('uses a non-modal popover and dismisses outside without blocking the page',()=>{
    render(<><DatePicker label="Date" value={TODAY} onChange={()=>{}} today={TODAY}/><button type="button">Next field</button></>);
    fireEvent.click(screen.getByRole('button',{name:/Choose date/}));
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBeNull();
    expect(document.documentElement.style.overflow).not.toBe('hidden');
    fireEvent.pointerDown(screen.getByRole('button',{name:'Next field'}));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('keeps only one shared popover open and closes when focus leaves',()=>{
    render(<><DatePicker label="First" value={TODAY} onChange={()=>{}} today={TODAY}/><DatePicker label="Second" value={TODAY} onChange={()=>{}} today={TODAY}/><button type="button">Next</button></>);
    fireEvent.click(screen.getByRole('button',{name:/Choose date: First/}));
    fireEvent.click(screen.getByRole('button',{name:/Choose date: Second/}));
    expect(screen.getAllByRole('dialog').length).toBe(1);
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Second');
    fireEvent.blur(screen.getByRole('dialog'),{relatedTarget:screen.getByRole('button',{name:'Next'})});
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('lets an open native month picker consume Escape before the calendar popover',()=>{
    render(<DatePicker label="Date" value={TODAY} onChange={()=>{}} today={TODAY}/>);
    fireEvent.click(screen.getByRole('button',{name:/Choose date/}));
    const dialog=screen.getByRole('dialog'),month=within(dialog).getByLabelText('Month');
    const original=month.matches.bind(month);
    const matches=vi.spyOn(month,'matches').mockImplementation(selector=>selector===':open'||original(selector));
    fireEvent.keyDown(month,{key:'Escape'});expect(dialog.isConnected).toBe(true);
    matches.mockRestore();fireEvent.keyDown(month,{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('commits a picked single date and keeps range changes as a draft until Apply',()=>{
    const change=vi.fn<(value:string|null)=>void>();
    const {unmount}=render(<DatePicker label="Date" value={TODAY} onChange={change} today={TODAY}/>);
    fireEvent.click(screen.getByRole('button',{name:/Choose date/}));fireEvent.click(cell(screen.getByRole('dialog'),'2026-10-20'));
    expect(change).toHaveBeenCalledWith('2026-10-20');expect(screen.queryByRole('dialog')).toBeNull();unmount();
    const rangeChange=vi.fn<(value:{start:string;end:string|null}|null)=>void>();
    render(<DateRangePicker label="Period" value={null} onChange={rangeChange} today={TODAY}/>);
    fireEvent.click(screen.getByRole('button',{name:/Choose date range/}));
    const dialog=screen.getByRole('dialog');fireEvent.click(cell(dialog,'2026-10-05'));fireEvent.click(cell(dialog,'2026-10-12'));
    expect(rangeChange).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button',{name:'Apply dates'}));
    expect(rangeChange).toHaveBeenCalledWith({start:'2026-10-05',end:'2026-10-12'});
  });
  it('cancels a range draft and can explicitly clear an optional range',()=>{
    const change=vi.fn<(value:{start:string;end:string|null}|null)=>void>();
    render(<DateRangePicker label="Period" value={{start:'2026-10-01',end:'2026-10-29'}} onChange={change} today={TODAY}/>);
    fireEvent.click(screen.getByRole('button',{name:/Choose date range/}));
    let dialog=screen.getByRole('dialog');fireEvent.click(cell(dialog,'2026-10-05'));fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:/Choose date range/}));dialog=screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button',{name:'Clear'}));
    fireEvent.click(within(dialog).getByRole('button',{name:'Apply dates'}));
    expect(change).toHaveBeenCalledWith(null);
  });
  it('reports unsupported BS coverage without changing the stored Gregorian day',()=>{
    const change=vi.fn<(value:string|null)=>void>();
    const {container}=render(<DatePicker label="Historic date" value="1800-01-01" onChange={change} calendar="bikram-sambat" name="historic" today={TODAY}/>);
    expect(screen.getByRole('alert').textContent).toContain('supported range');
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe('1800-01-01');
    expect(change).not.toHaveBeenCalled();
  });
  it('blocks native form submission for invalid or out-of-bounds typed input',async()=>{
    const change=vi.fn<(value:string|null)=>void>();
    render(<DatePicker label="Limited date" value={null} onChange={change} min="2026-10-01" max="2026-10-31" today={TODAY} required/>);
    const input=screen.getByLabelText('Limited date') as HTMLInputElement;
    fireEvent.change(input,{target:{value:'2026-11-01'}});fireEvent.blur(input);
    await act(async()=>{});
    expect(input.checkValidity()).toBe(false);expect(change).not.toHaveBeenCalled();
  });
});
