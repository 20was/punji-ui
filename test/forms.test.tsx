import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import { DatePicker, DateRangePicker } from '../src/date-picker/DatePicker.tsx';
import { DateRangePresetList } from '../src/date-picker/DateRangePresetList.tsx';
import { NumberField, OtpInput, PercentageInput, StatementUpload } from '../src/index.ts';
import type { PercentageInputChange, StatementRejection } from '../src/index.ts';
import { dateRangePresets } from '../src/date-range-presets/presets.ts';
import { nepalDateRangePresets } from '../src/date-range-presets/nepal.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

function Qty(props: { min?: string; max?: string; step?: string; initial?: string; integer?: boolean; onValue?: (v: unknown) => void; steppers?: boolean }) {
  const [v, setV] = useState(props.initial ?? '');
  return <NumberField label="Units" value={v} onChange={setV} integer={props.integer} step={props.step} min={props.min} max={props.max} steppers={props.steppers ?? true} onValueChange={props.onValue} testId="qty" />;
}

describe('NumberField steppers', () => {
  it('holds a stepper button to repeat, quickening, and stops on release, leave, blur and at the limit', () => {
    vi.useFakeTimers();
    try {
      render(<Qty integer step="1" min="0" max="12" initial="0" />);
      const input = screen.getByRole('spinbutton', { name: 'Units' }) as HTMLInputElement;
      const plus = screen.getByRole('button', { name: 'Increase' });
      fireEvent.pointerDown(plus, { button: 0 });
      expect(input.value).toBe('1');
      act(() => { vi.advanceTimersByTime(399); });
      expect(input.value).toBe('1');
      act(() => { vi.advanceTimersByTime(1); });
      expect(input.value).toBe('2');
      act(() => { vi.advanceTimersByTime(160); });
      expect(input.value).toBe('3');
      act(() => { vi.advanceTimersByTime(136); });
      expect(input.value).toBe('4');
      fireEvent.pointerUp(plus);
      act(() => { vi.advanceTimersByTime(2000); });
      expect(input.value).toBe('4');
      fireEvent.click(plus, { detail: 1 });
      expect(input.value).toBe('4');
      for (const stop of [() => fireEvent.pointerLeave(plus), () => fireEvent.pointerCancel(plus), () => fireEvent.blur(plus)]) {
        const before = Number(input.value);
        fireEvent.pointerDown(plus, { button: 0 });
        stop();
        act(() => { vi.advanceTimersByTime(2000); });
        expect(Number(input.value)).toBe(before + 1);
      }
      fireEvent.pointerDown(plus, { button: 0 });
      for (let i = 0; i < 50; i++) act(() => { vi.advanceTimersByTime(100); });
      expect(input.value).toBe('12');
      expect((plus as HTMLButtonElement).disabled).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      const minus = screen.getByRole('button', { name: 'Decrease' });
      fireEvent.pointerDown(minus, { button: 2 });
      expect(input.value).toBe('12');
    } finally { vi.useRealTimers(); }
  });
  it('keeps keyboard activation of a stepper button at one step', () => {
    render(<Qty integer step="1" initial="5" />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }), { detail: 0 });
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('6');
  });
  it('is a spin button whose arrows step exactly and clamp into min and max', async () => {
    const user = userEvent.setup();
    render(<Qty integer step="10" min="10" max="30" initial="20" />);
    const input = screen.getByRole('spinbutton', { name: 'Units' }) as HTMLInputElement;
    expect(input.getAttribute('aria-valuemin')).toBe('10');
    expect(input.getAttribute('aria-valuemax')).toBe('30');
    expect(input.getAttribute('aria-valuetext')).toBe('20');
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('30');
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('30');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(input.value).toBe('10');
    await user.keyboard('{End}');
    expect(input.value).toBe('30');
    await user.keyboard('{Home}');
    expect(input.value).toBe('10');
  });
  it('steps decimals without float error and ten steps with Shift or Page keys', async () => {
    const user = userEvent.setup();
    const seen: unknown[] = [];
    render(<Qty step="0.1" initial="0.2" onValue={(r) => seen.push(r)} steppers={false} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('0.3');
    expect(seen.at(-1)).toEqual({ state: 'valid', value: '0.3' });
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(input.value).toBe('1.3');
    await user.keyboard('{PageDown}');
    expect(input.value).toBe('0.3');
  });
  it('reads Devanagari digits and grouping, starts an empty field from zero and ignores unfinished text', async () => {
    const user = userEvent.setup();
    render(<Qty step="5" initial="" />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('5');
    await user.clear(input);
    await user.type(input, '१,००,०००');
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('100005');
    await user.clear(input);
    await user.type(input, '-');
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('-');
  });
  it('the buttons step too, are named, stay out of the Tab order and disable at the limits', async () => {
    const user = userEvent.setup();
    render(<Qty integer min="0" max="2" initial="1" />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    const inc = screen.getByRole('button', { name: 'Increase' });
    const dec = screen.getByRole('button', { name: 'Decrease' });
    expect(inc.tabIndex).toBe(-1);
    await user.click(inc);
    expect(input.value).toBe('2');
    expect((inc as HTMLButtonElement).disabled).toBe(true);
    await user.click(dec);
    await user.click(dec);
    expect(input.value).toBe('0');
    expect((dec as HTMLButtonElement).disabled).toBe(true);
  });
  it('does not step when disabled or read-only, and is a plain field without step or steppers', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NumberField label="Units" value="3" onChange={() => {}} step="1" readOnly />);
    await user.click(screen.getByRole('spinbutton'));
    await user.keyboard('{ArrowUp}');
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('3');
    rerender(<NumberField label="Units" value="3" onChange={() => {}} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
  it('throws when the step needs more digits than maxFractionDigits', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<NumberField label="x" value="" onChange={() => {}} step="0.001" />)).toThrow(/./);
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<Qty initial="3" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

function Pct(props: { initial?: string; min?: string; max?: string; digits?: 'latn' | 'deva'; allowNegative?: boolean; log?: PercentageInputChange[]; error?: string; maxFractionDigits?: number }) {
  const [v, setV] = useState(props.initial ?? '');
  return <PercentageInput label="Brokerage" value={v} onValueChange={(c) => { props.log?.push(c); setV(c.value); }} min={props.min} max={props.max} digits={props.digits} allowNegative={props.allowNegative} error={props.error} maxFractionDigits={props.maxFractionDigits} testId="pct" />;
}

describe('PercentageInput', () => {
  it('reports an exact decimal string and basis points, never a float', async () => {
    const user = userEvent.setup();
    const log: PercentageInputChange[] = [];
    render(<Pct log={log} />);
    const input = screen.getByTestId('pct') as HTMLInputElement;
    await user.type(input, '0.4');
    expect(log.at(-1)).toEqual({ value: '0.4', state: 'valid', basisPoints: 40n, outOfRange: null });
    await user.clear(input);
    await user.type(input, '11.25');
    expect(log.at(-1)).toMatchObject({ value: '11.25', basisPoints: 1125n });
    expect(input.value).toBe('11.25');
    expect(log.some((c) => 'basisPoints' in c && typeof c.basisPoints === 'number')).toBe(false);
  });
  it('refuses a third fraction digit instead of rounding and refuses letters and a minus', async () => {
    const user = userEvent.setup();
    render(<Pct />);
    const input = screen.getByTestId('pct') as HTMLInputElement;
    await user.type(input, '0.125');
    expect(input.value).toBe('0.12');
    await user.clear(input);
    await user.type(input, 'ab-5');
    expect(input.value).toBe('5');
  });
  it('accepts Devanagari digits, a pasted percent sign and shows Devanagari when asked', async () => {
    const user = userEvent.setup();
    const log: PercentageInputChange[] = [];
    render(<Pct log={log} digits="deva" />);
    const input = screen.getByTestId('pct') as HTMLInputElement;
    await user.type(input, '१२.५');
    expect(log.at(-1)).toMatchObject({ value: '12.5', state: 'valid' });
    expect(input.value).toBe('१२.५');
    await user.clear(input);
    await user.click(input);
    await user.paste('7.5 %');
    expect(log.at(-1)).toMatchObject({ value: '7.5' });
  });
  it('treats 12. and a lone minus as partial and finishes them on blur', async () => {
    const user = userEvent.setup();
    const log: PercentageInputChange[] = [];
    render(<Pct log={log} allowNegative />);
    const input = screen.getByTestId('pct') as HTMLInputElement;
    await user.type(input, '12.');
    expect(log.at(-1)).toMatchObject({ value: '12.', state: 'partial', basisPoints: null });
    await user.tab();
    expect(input.value).toBe('12');
    await user.clear(input);
    await user.type(input, '-');
    expect(log.at(-1)).toMatchObject({ state: 'partial' });
    await user.tab();
    expect(input.value).toBe('');
  });
  it('reports out-of-range and shows the message only after the field is left; a caller error wins', async () => {
    const user = userEvent.setup();
    const log: PercentageInputChange[] = [];
    const { rerender } = render(<Pct log={log} min="0" max="100" />);
    const input = screen.getByTestId('pct') as HTMLInputElement;
    await user.type(input, '150');
    expect(log.at(-1)).toMatchObject({ value: '150', outOfRange: 'above' });
    expect(screen.queryByRole('alert')).toBeNull();
    await user.tab();
    expect(screen.getByRole('alert').textContent).toBe('Enter a rate from 0% to 100%.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    rerender(<Pct log={log} min="0" max="100" initial="150" error="Over the cap" />);
    expect(screen.getByRole('alert').textContent).not.toContain('from 0%');
  });
  it('has no basis points beyond two fraction digits, labels the unit and is axe clean', async () => {
    const user = userEvent.setup();
    const log: PercentageInputChange[] = [];
    const { container } = render(<Pct log={log} maxFractionDigits={4} />);
    await user.type(screen.getByTestId('pct'), '0.0125');
    expect(log.at(-1)).toMatchObject({ value: '0.0125', basisPoints: null });
    expect(screen.getByLabelText(/Brokerage/).id).toBeTruthy();
    expect(container.querySelector('label')!.textContent).toContain('(percent)');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('throws on a bound that is not a plain decimal', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Pct min="abc" />)).toThrow(/./);
  });
});

function Otp(props: { length?: number; type?: 'numeric' | 'alphanumeric'; mask?: boolean; onComplete?: (v: string) => void; error?: string; name?: string }) {
  const [v, setV] = useState('');
  return <OtpInput label="Verification code" hint="Sent by SMS" value={v} onChange={setV} {...props} testId="otp" />;
}
const cells = () => screen.getAllByRole('textbox') as HTMLInputElement[];

describe('OtpInput', () => {
  it('marks long codes to wrap into two balanced rows instead of shrinking the boxes', () => {
    for (const [length, fit, cols] of [[6, null, '3'], [8, 'm', '4'], [9, 'l', '5'], [12, 'xl', '6']] as const) {
      const { unmount } = render(<Otp length={length} />);
      const group = screen.getByTestId('otp');
      expect([group.getAttribute('data-fit'), group.style.getPropertyValue('--otp-cols')]).toEqual([fit, cols]);
      unmount();
    }
  });
  it('is one labelled group with a name per box and the one-time-code autocomplete on the first', () => {
    render(<Otp />);
    const group = screen.getByRole('group', { name: 'Verification code' });
    expect(group.getAttribute('aria-describedby')).toBeTruthy();
    expect(group.getAttribute('dir')).toBe('ltr');
    expect(cells().map((c) => c.getAttribute('aria-label'))).toEqual(['Digit 1 of 6', 'Digit 2 of 6', 'Digit 3 of 6', 'Digit 4 of 6', 'Digit 5 of 6', 'Digit 6 of 6']);
    expect(cells()[0]!.getAttribute('autocomplete')).toBe('one-time-code');
    expect(cells()[0]!.inputMode).toBe('numeric');
  });
  it('moves forward as digits are typed, completes once, and filters letters', async () => {
    const user = userEvent.setup();
    const done = vi.fn<(code: string) => void>();
    render(<Otp onComplete={done} />);
    await user.click(cells()[0]!);
    await user.keyboard('1a2');
    expect(cells().map((c) => c.value).join('')).toBe('12');
    expect(document.activeElement).toBe(cells()[2]);
    await user.keyboard('3456');
    expect(cells().map((c) => c.value).join('')).toBe('123456');
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith('123456');
  });
  it('Backspace clears and steps back, the arrows, Home and End move, and focus cannot skip an empty box', async () => {
    const user = userEvent.setup();
    render(<Otp />);
    await user.click(cells()[0]!);
    await user.keyboard('123');
    await user.keyboard('{Backspace}');
    expect(cells().map((c) => c.value).join('')).toBe('12');
    expect(document.activeElement).toBe(cells()[2]);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(document.activeElement).toBe(cells()[0]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(cells()[2]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(cells()[0]);
    await user.click(cells()[5]!);
    expect(document.activeElement).toBe(cells()[2]);
  });
  it('spreads a paste across the boxes, converting Devanagari digits and dropping spaces', async () => {
    const user = userEvent.setup();
    const done = vi.fn<(code: string) => void>();
    render(<Otp onComplete={done} />);
    await user.click(cells()[0]!);
    await user.paste('१२३ ४५६');
    expect(cells().map((c) => c.value).join('')).toBe('123456');
    expect(done).toHaveBeenCalledWith('123456');
  });
  it('a short paste lands from the box it was pasted into and a long one is trimmed', async () => {
    const user = userEvent.setup();
    render(<Otp length={4} />);
    await user.click(cells()[0]!);
    await user.keyboard('1');
    await user.paste('22');
    expect(cells().map((c) => c.value).join('')).toBe('122');
    await user.click(cells()[0]!);
    await user.paste('98765');
    expect(cells().map((c) => c.value).join('')).toBe('9876');
  });
  it('autofill into the first box (the whole code in one change) fills every box', () => {
    render(<Otp length={4} />);
    fireEvent.change(cells()[0]!, { target: { value: '4821' } });
    expect(cells().map((c) => c.value).join('')).toBe('4821');
  });
  it('supports alphanumeric codes, masking and a form value', async () => {
    const user = userEvent.setup();
    const { container } = render(<Otp length={4} type="alphanumeric" mask name="pin" />);
    const boxes = Array.from(container.querySelectorAll<HTMLInputElement>('.pu-otp-cell'));
    expect(boxes.every((b) => b.type === 'password')).toBe(true);
    expect(boxes[0]!.getAttribute('aria-label')).toBe('Character 1 of 4');
    expect(boxes[0]!.inputMode).toBe('text');
    await user.click(boxes[0]!);
    await user.keyboard('a9Z!');
    await user.keyboard('x');
    expect(container.querySelector<HTMLInputElement>('input[name="pin"]')!.value).toBe('a9Zx');
  });
  it('shows an error as an alert and marks every box invalid', async () => {
    const { container } = render(<Otp error="That code has expired." />);
    expect(screen.getByRole('alert').textContent).toBe('That code has expired.');
    expect(cells().every((c) => c.getAttribute('aria-invalid') === 'true')).toBe(true);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('rejects a length outside 2 to 12 and renders on the server', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Otp length={1} />)).toThrow(/./);
    expect(renderToString(<OtpInput label="Code" />)).toContain('one-time-code');
  });
});

const csv = (name = 'nabil-2083.csv', size = 2048) => new File([new Uint8Array(size)], name, { type: 'text/csv', lastModified: 1 });

function Upload(props: { multiple?: boolean; maxSize?: number; maxFiles?: number; onReject?: (r: StatementRejection[]) => void }) {
  const [files, setFiles] = useState<readonly File[]>([]);
  return <StatementUpload label="Bank statement" value={files} onChange={setFiles} testId="up" {...props} />;
}

describe('StatementUpload', () => {
  it('is a labelled group with a keyboard route: a real button opens the file picker', async () => {
    const user = userEvent.setup();
    const { container } = render(<Upload />);
    expect(screen.getByRole('group', { name: 'Bank statement' })).toBeTruthy();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.accept).toBe('.csv,.pdf');
    const click = vi.spyOn(input, 'click');
    screen.getByRole('button', { name: 'Choose file' }).focus();
    await user.keyboard('{Enter}');
    expect(click).toHaveBeenCalled();
    expect(screen.getByText('CSV or PDF, up to 5 MB each')).toBeTruthy();
  });
  it('accepts a CSV, shows name and size, and removes it with focus returning to the button', async () => {
    const user = userEvent.setup();
    render(<Upload />);
    await user.upload(screen.getByTestId('up-input'), csv('nabil.csv', 14540));
    const list = screen.getByRole('list', { name: 'Selected files' });
    expect(within(list).getByText('nabil.csv')).toBeTruthy();
    expect(within(list).getByText('14.2 KB')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('nabil.csv added');
    await user.click(screen.getByRole('button', { name: 'Remove nabil.csv' }));
    expect(screen.queryByRole('list', { name: 'Selected files' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose file' }));
    expect(screen.getByRole('status').textContent).toBe('nabil.csv removed');
  });
  it('refuses the wrong type, an empty file and an oversize file with a message each, and reports them', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onReject = vi.fn<(rejections: StatementRejection[]) => void>();
    render(<Upload multiple maxSize={5000} onReject={onReject} />);
    const input = screen.getByTestId('up-input');
    await user.upload(input, [new File(['x'], 'photo.png', { type: 'image/png' }), csv('empty.csv', 0), csv('big.csv', 6000), csv('ok.csv', 100)]);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('photo.png is not a supported file. Use CSV or PDF.');
    expect(alert.textContent).toContain('empty.csv is empty.');
    expect(alert.textContent).toContain('big.csv is larger than 4.9 KB.');
    expect(onReject.mock.calls[0]![0].map((r) => r.reason)).toEqual(['type', 'empty', 'size']);
    expect(screen.getByText('ok.csv')).toBeTruthy();
    expect(screen.queryByText('photo.png', { selector: '.pu-upload-name' })).toBeNull();
  });
  it('replaces the file in single mode; in multiple mode refuses duplicates and files past the limit', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Upload />);
    await user.upload(screen.getByTestId('up-input'), csv('a.csv'));
    await user.upload(screen.getByTestId('up-input'), csv('b.csv'));
    expect(screen.queryByText('a.csv')).toBeNull();
    expect(screen.getByText('b.csv')).toBeTruthy();
    unmount();
    render(<Upload multiple maxFiles={2} />);
    await user.upload(screen.getByTestId('up-input'), [csv('a.csv'), csv('b.csv')]);
    await user.upload(screen.getByTestId('up-input'), csv('a.csv'));
    expect(screen.getByRole('alert').textContent).toBe('a.csv is already added.');
    await user.upload(screen.getByTestId('up-input'), csv('c.csv'));
    expect(screen.getByRole('alert').textContent).toBe('c.csv was not added: the limit is 2 files.');
    expect(within(screen.getByRole('list', { name: 'Selected files' })).getAllByRole('listitem')).toHaveLength(2);
  });
  it('takes dropped files, shows the drag state and never sends a request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = render(<Upload />);
    const zone = container.querySelector('.pu-upload-zone')!;
    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(zone.getAttribute('data-dragging')).toBe('true');
    fireEvent.drop(zone, { dataTransfer: { files: [csv('dropped.csv')] } });
    expect(zone.getAttribute('data-dragging')).toBeNull();
    expect(screen.getByText('dropped.csv')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('does nothing when disabled and shows a caller error', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<StatementUpload label="Statement" disabled />);
    expect((screen.getByRole('button', { name: 'Choose file' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.drop(container.querySelector('.pu-upload-zone')!, { dataTransfer: { files: [csv()] } });
    expect(screen.queryByRole('list')).toBeNull();
    rerender(<StatementUpload label="Statement" error="Upload failed. Try again." />);
    expect(screen.getByRole('alert').textContent).toBe('Upload failed. Try again.');
    await user.tab();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('is uncontrolled by default and renders on the server', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(files: File[]) => void>();
    render(<StatementUpload label="Statement" onChange={onChange} testId="u" />);
    await user.upload(screen.getByTestId('u-input'), csv('x.csv'));
    expect(onChange.mock.calls[0]![0]).toHaveLength(1);
    expect(screen.getByText('x.csv')).toBeTruthy();
    cleanup();
    expect(renderToString(<StatementUpload label="Statement" />)).toContain('Choose file');
  });
});

describe('DateRangePicker presets', () => {
  const TODAY = '2026-11-04';
  beforeAll(async () => {
    render(<DatePicker label="Warm up" value={null} onChange={() => {}} today={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /Choose date/ }));
    await screen.findByRole('dialog');
    cleanup();
  });
  it('lists the presets in the popover, applies one at once and closes', () => {
    const change = vi.fn<(range: { start: string; end: string | null } | null) => void>();
    render(<DateRangePicker label="Period" value={null} onChange={change} today={TODAY} presets={dateRangePresets({ today: TODAY, fiscalYearStartMonth: 7 })} />);
    fireEvent.click(screen.getByRole('button', { name: /Choose date range/ }));
    const dialog = screen.getByRole('dialog');
    const group = within(dialog).getByRole('group', { name: 'Quick ranges' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Today', 'This week', 'This month', 'Last 30 days', 'Fiscal year to date']);
    fireEvent.click(within(group).getByRole('button', { name: 'Fiscal year to date' }));
    expect(change).toHaveBeenCalledWith({ start: '2026-07-01', end: TODAY });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('marks the preset that matches the draft and disables ones outside min and max or across unavailable days', () => {
    const presets = nepalDateRangePresets({ today: TODAY });
    const thisWeek = presets.find((p) => p.id === 'this-week')!.range;
    render(<DateRangePicker label="Period" value={thisWeek} onChange={() => {}} today={TODAY} min="2026-10-20" isDateUnavailable={(d) => d === '2026-11-02'} presets={presets} />);
    fireEvent.click(screen.getByRole('button', { name: /Choose date range/ }));
    const group = within(screen.getByRole('dialog')).getByRole('group', { name: 'Quick ranges' });
    expect((within(group).getByRole('button', { name: 'Today' }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(group).getByRole('button', { name: 'This week' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(group).getByRole('button', { name: 'Fiscal year to date' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('the list also works on its own and is axe clean', async () => {
    const onSelect = vi.fn<(range: { start: string; end: string }) => void>();
    const { container } = render(<DateRangePresetList presets={dateRangePresets({ today: TODAY })} value={{ start: TODAY, end: TODAY }} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'This week' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(onSelect).toHaveBeenCalledWith({ start: '2026-10-06', end: TODAY });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
