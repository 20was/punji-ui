'use client';

/**
 * NepalAddressPicker: Province, District and Local level (metropolitan city, sub-metropolitan city, municipality or
 * rural municipality) as three linked selects, plus the ward number: the address block of every Nepali KYC form.
 * Choosing a province narrows the districts; choosing a district narrows the local levels; changing a level clears
 * the levels under it. The list of 753 local levels lives in `@punji/ui/nepal-address-data` and is loaded on demand
 * the first time the picker mounts, so it never weighs on the root import. Pass `data` to supply it yourself.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';

import { Field, SelectField } from '../fields/Fields.tsx';
import { asciiDigits, showDigits } from '../internal/lendingDigits.ts';
import type { LocalLevelType, NepalAddressData } from '../nepal-address-data/data.ts';
import { Skeleton } from '../states/States.tsx';

export interface NepalAddress {
  /** The province's English name, or '' when none is chosen. */
  province: string;
  /** The district's English name, or ''. */
  district: string;
  /** The local level's English name, or ''. */
  localLevel: string;
  /** The ward number as ASCII digits ('4'), or ''. */
  ward: string;
}

export const emptyNepalAddress: NepalAddress = Object.freeze({ province: '', district: '', localLevel: '', ward: '' });

export interface NepalAddressPickerLabels {
  /** The group's legend. Default "Address". */
  legend: string;
  province: string;
  district: string;
  localLevel: string;
  ward: string;
  /** The empty choice in each select. */
  choose: string;
  /** Words after a local level's name, by type. */
  types: Record<LocalLevelType, string>;
  /** Said while the list loads. */
  loading: string;
  /** Shown when the list cannot load. */
  loadError: string;
  /** For a ward outside 1 to 33 (Pokhara has the most wards, 33). */
  wardError: string;
}

export const nepalAddressPickerLabels: NepalAddressPickerLabels = {
  legend: 'Address', province: 'Province', district: 'District', localLevel: 'Municipality or rural municipality', ward: 'Ward number', choose: 'Choose',
  types: { metropolitan: 'Metropolitan City', 'sub-metropolitan': 'Sub-Metropolitan City', municipality: 'Municipality', 'rural-municipality': 'Rural Municipality' },
  loading: 'Loading the list of places', loadError: 'The list of places could not load. Check your connection and reload the page.', wardError: 'Enter a ward number from 1 to 33.',
};

export interface NepalAddressPickerProps {
  /** The chosen address (controlled). Start with `emptyNepalAddress`. */
  value: NepalAddress;
  /** Called with the whole address after every change. Lower levels are cleared when a higher one changes. */
  onChange: (address: NepalAddress) => void;
  /** The address data. Omit to load `@punji/ui/nepal-address-data` on first mount. */
  data?: NepalAddressData;
  /** Province and district names in English (default) or Nepali. Local-level names are English. */
  language?: 'en' | 'ne';
  /** Show the ward digits in Devanagari. The value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Leave out the ward field. */
  hideWard?: boolean;
  /** Errors per field (from your own validation or the server). */
  errors?: Partial<Record<keyof NepalAddress, ReactNode>>;
  /** Replace any words, for translation. */
  labels?: Partial<NepalAddressPickerLabels>;
  /** Field size: 'lg' (default) or 'md'. */
  size?: 'md' | 'lg';
  /** Extra class on the fieldset. */
  className?: string;
  /** Sets `data-testid` on the fieldset; the selects get `-province`, `-district`, `-local` and `-ward`. */
  testId?: string;
}

let cached: NepalAddressData | null = null;
let pending: Promise<NepalAddressData> | null = null;
/** Load the address list once per page; later pickers reuse it. */
export function loadNepalAddressData(): Promise<NepalAddressData> {
  if (cached) return Promise.resolve(cached);
  pending ??= import('../nepal-address-data/data.ts').then((m) => (cached = m.nepalAddressData)).catch((error: unknown) => { pending = null; throw error; });
  return pending;
}

export function NepalAddressPicker({ value, onChange, data, language = 'en', digits = 'latn', hideWard, errors, labels, size, className, testId }: NepalAddressPickerProps) {
  const words = { ...nepalAddressPickerLabels, ...labels, types: { ...nepalAddressPickerLabels.types, ...labels?.types } };
  const uid = useId();
  const [loaded, setLoaded] = useState<NepalAddressData | null>(data ?? cached);
  const [failed, setFailed] = useState(false);
  const [wardLeft, setWardLeft] = useState(false);
  useEffect(() => {
    if (data || loaded) return;
    let live = true;
    loadNepalAddressData().then((d) => { if (live) setLoaded(d); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [data, loaded]);
  const list = data ?? loaded;
  const id = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);

  if (!list) {
    return (
      <fieldset className={`pu-addr${className ? ` ${className}` : ''}`} data-testid={testId} aria-busy={!failed}>
        <legend>{words.legend}</legend>
        {failed ? <p className="pu-addr-error" role="alert">{words.loadError}</p> : (
          <div role="status" aria-label={words.loading} className="pu-addr-grid">
            <Skeleton height={44} /><Skeleton height={44} /><Skeleton height={44} />{!hideWard && <Skeleton height={44} />}
          </div>
        )}
      </fieldset>
    );
  }

  const name = (item: { name: string; nameNe: string }) => (language === 'ne' ? item.nameNe : item.name);
  const province = list.provinces.find((p) => p.name === value.province);
  const district = province ? list.districts.find((d) => d.provinceId === province.id && d.name === value.district) : undefined;
  const choose = { value: '', label: words.choose };
  const wardNumber = Number(value.ward);
  const wardError = wardLeft && value.ward !== '' && !(Number.isInteger(wardNumber) && wardNumber >= 1 && wardNumber <= 33) ? words.wardError : undefined;
  return (
    <fieldset className={`pu-addr${className ? ` ${className}` : ''}`} data-testid={testId}>
      <legend>{words.legend}</legend>
      <div className="pu-addr-grid">
        <SelectField label={words.province} size={size} value={province ? province.name : ''} error={errors?.province} testId={id('province')}
          options={[choose, ...list.provinces.map((p) => ({ value: p.name, label: name(p) }))]}
          onChange={(next) => onChange({ province: next, district: '', localLevel: '', ward: value.ward })} />
        <SelectField label={words.district} size={size} value={district ? district.name : ''} error={errors?.district} testId={id('district')}
          options={[choose, ...(province ? list.districts.filter((d) => d.provinceId === province.id).map((d) => ({ value: d.name, label: name(d) })) : [])]}
          onChange={(next) => onChange({ ...value, province: province?.name ?? '', district: next, localLevel: '' })} />
        <SelectField label={words.localLevel} size={size} value={district && list.localLevels.some((l) => l.districtId === district.id && l.name === value.localLevel) ? value.localLevel : ''} error={errors?.localLevel} testId={id('local')}
          options={[choose, ...(district ? list.localLevels.filter((l) => l.districtId === district.id).map((l) => ({ value: l.name, label: `${l.name} ${words.types[l.type]}` })) : [])]}
          onChange={(next) => onChange({ ...value, localLevel: next })} />
        {!hideWard && (
          <Field label={words.ward} size={size} inputMode="numeric" autoComplete="off" maxLength={2} id={`${uid}-ward`} testId={id('ward')}
            value={showDigits(value.ward, digits)} error={errors?.ward ?? wardError}
            onBlur={() => setWardLeft(true)}
            onChange={(raw) => {
              const ascii = asciiDigits(raw).trim();
              if (/^\d{0,2}$/.test(ascii)) onChange({ ...value, ward: ascii });
            }} />
        )}
      </div>
    </fieldset>
  );
}
