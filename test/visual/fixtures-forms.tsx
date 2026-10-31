import { useState, type ReactNode } from 'react';
import {
  DateRangePicker, DateRangePresetList, NumberField, OtpInput, PercentageInput, StatementUpload,
  dateRangePresets, nepalDateRangePresets, type DateRange,
} from '@punji/ui';

// Wave 2 form fixtures: steppers, PercentageInput, OtpInput, StatementUpload and date-range presets. All data is invented.
const noop = () => undefined;
const today = '2025-11-14';
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;

function NumberStepperFixture() {
  const [units, setUnits] = useState('50');
  const [price, setPrice] = useState('487.5');
  const [atMax, setAtMax] = useState('5000');
  return <div className="vr-grid">
    <NumberField integer label="Units (lots of 10)" value={units} onChange={setUnits} step="10" min="10" max="5000" steppers hint="Up to 5,000" testId="vr-ns-units" />
    <NumberField label="Limit price" value={price} onChange={setPrice} step="0.1" min="0.1" steppers hint="Tick 0.10" testId="vr-ns-price" />
    <NumberField integer label="At the maximum" value={atMax} onChange={setAtMax} step="10" min="10" max="5000" steppers testId="vr-ns-max" />
    <NumberField integer label="Disabled" value="30" onChange={noop} step="10" steppers disabled />
    <NumberField integer label="With an error" value="5" onChange={noop} step="10" min="10" steppers error="Minimum order is 10 units" />
    <NumberField integer size="md" label="Compact" value="120" onChange={noop} step="10" steppers />
  </div>;
}

function PercentageCase({ label, initial, ...rest }: { label: string; initial: string; min?: string; max?: string; digits?: 'latn' | 'deva'; error?: string; disabled?: boolean; hint?: string; testId?: string }) {
  const [v, setV] = useState(initial);
  return <PercentageInput label={label} value={v} onValueChange={(c) => setV(c.value)} {...rest} />;
}
function PercentageInputFixture() {
  return <div className="vr-grid">
    <PercentageCase label="Brokerage (empty)" initial="" hint="Per trade" testId="vr-pct" />
    <PercentageCase label="Brokerage (filled)" initial="0.4" min="0" max="2" />
    <PercentageCase label="Interest rate (Devanagari)" initial="11.25" digits="deva" />
    <PercentageCase label="Interest rate (error)" initial="26" error="The rate cannot be more than 24%" min="0" max="24" />
    <PercentageCase label="Rate (disabled)" initial="5" disabled />
  </div>;
}

function OtpCase({ label, ...rest }: { label: string; length?: number; mask?: boolean; type?: 'numeric' | 'alphanumeric'; error?: string; disabled?: boolean; hint?: string; defaultValue?: string; testId?: string; size?: 'md' | 'lg' }) {
  return <OtpInput label={label} {...rest} />;
}
function OtpInputFixture() {
  return <div className="vr-grid">
    <OtpCase label="Verification code (empty)" hint="Sent by SMS to 98XXXXXX12" testId="vr-otp" />
    <OtpCase label="Verification code (partial)" defaultValue="482" />
    <OtpCase label="Verification code (full)" defaultValue="482913" />
    <OtpCase label="PIN (masked)" length={4} mask defaultValue="1234" />
    <OtpCase label="Verification code (error)" defaultValue="482913" error="That code has expired. Request a new one." />
    <OtpCase label="Recovery code (alphanumeric, compact)" length={8} type="alphanumeric" size="md" defaultValue="K7QX" />
    <OtpCase label="Verification code (disabled)" defaultValue="4829" disabled />
  </div>;
}

function csv(name: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type: 'text/csv', lastModified: 1_730_000_000_000 });
}
function StatementUploadFixture() {
  return <div className="vr-grid">
    <Block title="Empty"><StatementUpload label="Broker statement" testId="vr-su" /></Block>
    <Block title="One file"><StatementUpload label="Broker statement" defaultValue={[csv('nepse-trade-book-2082.csv', 14540)]} /></Block>
    <Block title="Several files, long name"><StatementUpload label="Monthly statements" multiple defaultValue={[csv('nabil-2082-shrawan.csv', 24000), csv('a-very-long-statement-file-name-for-the-month-of-bhadra-2082-final-version.csv', 2_411_000)]} /></Block>
    <Block title="Error from the caller"><StatementUpload label="Broker statement" error="Upload failed. Check your connection and try again." /></Block>
    <Block title="Disabled"><StatementUpload label="Broker statement" disabled /></Block>
  </div>;
}

function DateRangePresetsFixture() {
  const [range, setRange] = useState<DateRange | null>({ start: '2025-11-14', end: '2025-11-14' });
  const list = dateRangePresets({ today, fiscalYearStartMonth: 7 });
  const nepal = nepalDateRangePresets({ today, language: 'ne' });
  return <div className="vr-grid">
    <Block title="Picker with presets">
      <DateRangePicker label="Trade period" value={range} onChange={setRange} today={today} defaultMonth="2025-11-01" presets={nepalDateRangePresets({ today, calendar: 'gregory' })} testId="vr-drpp" />
    </Block>
    <Block title="List, one pressed"><DateRangePresetList presets={list} value={{ start: today, end: today }} onSelect={noop} /></Block>
    <Block title="List, Nepali labels, one disabled"><DateRangePresetList presets={nepal} value={null} onSelect={noop} isDisabled={(r) => r.start < '2025-11-01'} label="छिटो अवधि" /></Block>
  </div>;
}

export const formsRegistry: Record<string, () => ReactNode> = {
  'number-stepper': NumberStepperFixture, 'percentage-input': PercentageInputFixture, 'otp-input': OtpInputFixture,
  'statement-upload': StatementUploadFixture, 'date-range-presets': DateRangePresetsFixture,
};
