/**
 * EMVCo merchant-presented QR (MPM) payloads: the text inside a Fonepay, NepalPay or other EMVCo "scan to pay" code.
 * Build one from typed fields, parse one back, and check its CRC. A payload is a list of TLV objects (two-digit id,
 * two-digit length, value) ending with the CRC object `63` (CRC-16/CCITT-FALSE over everything before its value).
 *
 * Pure and dependency free. Amounts are bigint minor units, never floats. It knows the EMVCo layout, not any
 * acquirer: the merchant account template (ids 26 to 51, a GUID and the scheme's own sub-fields) comes from your
 * acquirer or switch. A payload that parses is well formed; whether the merchant exists is for the payment network.
 */
import { minorUnitsToDecimal, parseMinorUnits } from '../nepal/money.ts';

/** One TLV object. `children` is set by `parseTlv` for template ids (26 to 51, 62, 64, 80 to 99) whose value parses as TLV. */
export interface EmvTlv {
  id: string;
  value: string;
  children?: readonly EmvTlv[];
}

/** A merchant account information template (ids 02 to 51). */
export interface EmvMerchantAccount {
  /** '02' to '51'. Ids 26 to 51 are templates with a globally unique identifier in sub-id 00. */
  id: string;
  /** For ids 26 to 51: the GUID or reverse domain in sub-id 00 (assigned by the scheme). */
  guid?: string;
  /** Sub-fields after the GUID, keyed by two-digit sub-id ('01': merchant id, ...). For ids 02 to 25 use `value`. */
  fields?: Readonly<Record<string, string>>;
  /** The raw value, for ids 02 to 25 (card-scheme primitives) or a template you encoded yourself. */
  value?: string;
}

/** Additional data field template (id 62). Each is optional; at most 25 characters each. */
export interface EmvAdditionalData {
  billNumber?: string;
  mobileNumber?: string;
  storeLabel?: string;
  loyaltyNumber?: string;
  referenceLabel?: string;
  customerLabel?: string;
  terminalLabel?: string;
  purpose?: string;
  /** Additional consumer data request: any of 'A' (address), 'M' (mobile), 'E' (email), at most once each. */
  consumerDataRequest?: string;
}

export type EmvTip =
  | { type: 'prompt' }
  | { type: 'fixed'; fee: bigint }
  | { type: 'percentage'; percent: string };

export interface MerchantQrInput {
  /** At least one merchant account template, from your acquirer. */
  merchantAccounts: readonly EmvMerchantAccount[];
  /** Merchant name as printed (id 59), 1 to 25 characters. */
  merchantName: string;
  /** Merchant city (id 60), 1 to 15 characters. */
  merchantCity: string;
  /** ISO 3166-1 alpha-2 (id 58). Default 'NP'. */
  countryCode?: string;
  /** ISO 4217 alpha ('NPR', 'INR', 'USD') or three-digit numeric code ('524'). Default 'NPR'. */
  currency?: string;
  /** Minor-unit digits for the amount and fixed fee. Default: known for NPR, INR and USD (2), otherwise required. */
  exponent?: number;
  /** Merchant category code (id 52), four digits. Default '0000'. */
  merchantCategoryCode?: string;
  /** The amount (id 54) in minor units. Omit for a static code where the payer enters the amount. */
  amount?: bigint | null;
  /** 'static' (11, reusable) or 'dynamic' (12, one payment). Default: dynamic when an amount is set, else static. */
  pointOfInitiation?: 'static' | 'dynamic';
  /** Tip or convenience fee (ids 55 to 57). */
  tip?: EmvTip;
  /** Postal code (id 61). */
  postalCode?: string;
  /** Additional data (id 62). */
  additionalData?: EmvAdditionalData;
  /** Merchant name and city in another language (id 64), for example Nepali in Devanagari. */
  alternateLanguage?: { language: string; merchantName: string; merchantCity?: string };
  /** Other objects (ids 65 to 99, RFU or unreserved templates), encoded in id order after the standard ones. */
  extra?: readonly { id: string; value: string }[];
}

export interface ParsedMerchantQr {
  payloadFormat: string;
  pointOfInitiation: 'static' | 'dynamic' | null;
  merchantAccounts: readonly EmvMerchantAccount[];
  merchantCategoryCode: string | null;
  /** Three-digit ISO 4217 numeric code as in the payload ('524'). */
  currencyNumeric: string | null;
  /** The alpha code when the numeric code is one this module knows (NPR, INR, USD), otherwise null. */
  currency: string | null;
  /** Amount in minor units, or null for a static code without an amount. */
  amount: bigint | null;
  /** The amount exactly as written in the payload ('1250.50'). */
  amountText: string | null;
  tip: EmvTip | null;
  countryCode: string | null;
  merchantName: string | null;
  merchantCity: string | null;
  postalCode: string | null;
  additionalData: EmvAdditionalData;
  alternateLanguage: { language: string; merchantName: string; merchantCity?: string } | null;
  /** Every top-level object in order, CRC included. */
  objects: readonly EmvTlv[];
}

export type EmvQrErrorCode = 'empty' | 'malformed' | 'crc' | 'format' | 'missing' | 'amount';

export type MerchantQrParseResult =
  | { ok: true; value: ParsedMerchantQr }
  | { ok: false; code: EmvQrErrorCode; message: string };

const CURRENCIES: Readonly<Record<string, readonly [string, number]>> = { NPR: ['524', 2], INR: ['356', 2], USD: ['840', 2] };
const ADDITIONAL: readonly (readonly [keyof EmvAdditionalData, string])[] = [
  ['billNumber', '01'], ['mobileNumber', '02'], ['storeLabel', '03'], ['loyaltyNumber', '04'], ['referenceLabel', '05'],
  ['customerLabel', '06'], ['terminalLabel', '07'], ['purpose', '08'], ['consumerDataRequest', '09'],
];
/** Payloads are capped at 512 characters by the EMVCo specification. */
export const EMV_QR_MAX_LENGTH = 512;

/** Characters, counted as Unicode code points (the EMVCo length unit). */
const lengthOf = (text: string): number => Array.from(text).length;
const isTemplate = (id: number): boolean => (id >= 26 && id <= 51) || id === 62 || id === 64 || id >= 80;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) of the text's UTF-8 bytes, as four upper-case hex digits. */
export function crc16Ccitt(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** One TLV object: id (two digits), length (two digits, 1 to 99 characters) and value. */
export function encodeTlv(id: string, value: string): string {
  if (!/^\d\d$/.test(id)) throw new RangeError(`EMV QR id must be two digits: ${id}`);
  const length = lengthOf(value);
  if (length < 1 || length > 99) throw new RangeError(`EMV QR object ${id} must be 1 to 99 characters (got ${length})`);
  return `${id}${String(length).padStart(2, '0')}${value}`;
}

/** Splits a TLV string into objects. Template ids get `children` when their value is itself valid TLV. Throws on malformed input. */
export function parseTlv(text: string): EmvTlv[] {
  const chars = Array.from(text);
  const out: EmvTlv[] = [];
  let at = 0;
  while (at < chars.length) {
    const head = chars.slice(at, at + 4).join('');
    if (!/^\d{4}$/.test(head)) throw new SyntaxError(`EMV QR: expected an id and length at character ${at}`);
    const id = head.slice(0, 2);
    const length = Number(head.slice(2));
    if (length < 1 || at + 4 + length > chars.length) throw new SyntaxError(`EMV QR: object ${id} runs past the end`);
    const value = chars.slice(at + 4, at + 4 + length).join('');
    const object: EmvTlv = { id, value };
    if (isTemplate(Number(id))) {
      try { const children = parseTlv(value); if (children.length) object.children = children; } catch { /* not a template value; keep it raw */ }
    }
    out.push(object);
    at += 4 + length;
  }
  return out;
}

function currencyOf(currency: string, exponent: number | undefined): [string, number] {
  const known = CURRENCIES[currency.toUpperCase()] ?? Object.values(CURRENCIES).find(([numeric]) => numeric === currency);
  const numeric = known?.[0] ?? (/^\d{3}$/.test(currency) ? currency : null);
  if (!numeric) throw new RangeError(`EMV QR currency must be NPR, INR, USD or a three-digit ISO 4217 code: ${currency}`);
  const scale = exponent ?? known?.[1];
  if (scale === undefined || !Number.isInteger(scale) || scale < 0 || scale > 4) throw new RangeError(`EMV QR needs an exponent (0 to 4) for currency ${currency}`);
  return [numeric, scale];
}

function amountText(minor: bigint, scale: number, what: string): string {
  if (minor <= 0n) throw new RangeError(`EMV QR ${what} must be more than zero`);
  const text = minorUnitsToDecimal(minor, scale);
  if (text.length > 13) throw new RangeError(`EMV QR ${what} is longer than 13 characters`);
  return text;
}

function bounded(id: string, value: string, max: number, what: string): string {
  if (lengthOf(value) > max) throw new RangeError(`EMV QR ${what} must be at most ${max} characters`);
  return encodeTlv(id, value);
}

/** Builds a merchant-presented payload, CRC included. Throws RangeError for a value the format cannot carry. */
export function buildMerchantQr(input: MerchantQrInput): string {
  const [numeric, scale] = currencyOf(input.currency ?? 'NPR', input.exponent);
  const amount = input.amount ?? null;
  const initiation = input.pointOfInitiation ?? (amount === null ? 'static' : 'dynamic');
  const mcc = input.merchantCategoryCode ?? '0000';
  if (!/^\d{4}$/.test(mcc)) throw new RangeError('EMV QR merchant category code must be four digits');
  const country = input.countryCode ?? 'NP';
  if (!/^[A-Z]{2}$/.test(country)) throw new RangeError('EMV QR country code must be two capital letters');
  if (!input.merchantAccounts.length) throw new RangeError('EMV QR needs at least one merchant account');
  if (!input.merchantName.trim() || !input.merchantCity.trim()) throw new RangeError('EMV QR needs a merchant name and city');

  let out = encodeTlv('00', '01') + encodeTlv('01', initiation === 'static' ? '11' : '12');
  const accounts = input.merchantAccounts.toSorted((a, b) => Number(a.id) - Number(b.id));
  for (const account of accounts) {
    const n = Number(account.id);
    if (!/^\d\d$/.test(account.id) || n < 2 || n > 51) throw new RangeError(`EMV QR merchant account id must be 02 to 51: ${account.id}`);
    if (account.value !== undefined) { out += encodeTlv(account.id, account.value); continue; }
    if (n < 26 || !account.guid) throw new RangeError(`EMV QR merchant account ${account.id} needs a value, or a guid for ids 26 to 51`);
    let inner = bounded('00', account.guid, 32, 'merchant account GUID');
    for (const sub of Object.keys(account.fields ?? {}).toSorted()) {
      if (sub === '00') throw new RangeError('EMV QR merchant account sub-id 00 is the GUID');
      inner += encodeTlv(sub, account.fields![sub]!);
    }
    out += encodeTlv(account.id, inner);
  }
  out += encodeTlv('52', mcc) + encodeTlv('53', numeric);
  if (amount !== null) out += encodeTlv('54', amountText(amount, scale, 'amount'));
  if (input.tip?.type === 'prompt') out += encodeTlv('55', '01');
  else if (input.tip?.type === 'fixed') out += encodeTlv('55', '02') + encodeTlv('56', amountText(input.tip.fee, scale, 'fixed fee'));
  else if (input.tip?.type === 'percentage') {
    if (!/^(?:100(?:\.0+)?|\d{1,2}(?:\.\d{1,2})?)$/.test(input.tip.percent) || /^0+(?:\.0+)?$/.test(input.tip.percent)) throw new RangeError('EMV QR tip percentage must be more than 0 and at most 100');
    out += encodeTlv('55', '03') + encodeTlv('57', input.tip.percent);
  }
  out += encodeTlv('58', country) + bounded('59', input.merchantName, 25, 'merchant name') + bounded('60', input.merchantCity, 15, 'merchant city');
  if (input.postalCode) out += bounded('61', input.postalCode, 10, 'postal code');
  const data = input.additionalData ?? {};
  let additional = '';
  for (const [key, sub] of ADDITIONAL) {
    const value = data[key];
    if (value === undefined || value === '') continue;
    if (key === 'consumerDataRequest' && !/^(?!.*(.).*\1)[AME]{1,3}$/.test(value)) throw new RangeError('EMV QR consumer data request must use A, M and E at most once each');
    additional += bounded(sub, value, 25, key);
  }
  if (additional) out += encodeTlv('62', additional);
  const alt = input.alternateLanguage;
  if (alt) {
    if (!/^[A-Za-z]{2}$/.test(alt.language)) throw new RangeError('EMV QR alternate language must be an ISO 639-1 code');
    out += encodeTlv('64', encodeTlv('00', alt.language) + bounded('01', alt.merchantName, 25, 'alternate merchant name') + (alt.merchantCity ? bounded('02', alt.merchantCity, 15, 'alternate merchant city') : ''));
  }
  for (const extra of (input.extra ?? []).toSorted((a, b) => Number(a.id) - Number(b.id))) {
    if (Number(extra.id) < 65) throw new RangeError(`EMV QR extra objects must use ids 65 to 99: ${extra.id}`);
    out += encodeTlv(extra.id, extra.value);
  }
  out += '6304';
  out += crc16Ccitt(out);
  if (lengthOf(out) > EMV_QR_MAX_LENGTH) throw new RangeError(`EMV QR payload is longer than ${EMV_QR_MAX_LENGTH} characters`);
  return out;
}

/** True when the payload ends with a CRC object whose value matches the text before it (case-insensitive hex). */
export function verifyMerchantQrCrc(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== '6304') return false;
  return payload.slice(-4).toUpperCase() === crc16Ccitt(payload.slice(0, -4));
}

const fail = (code: EmvQrErrorCode, message: string): MerchantQrParseResult => ({ ok: false, code, message });

/**
 * Parses and checks a scanned payload. Never throws: a bad payload comes back as `{ ok: false, code, message }` so a
 * scanner screen can say what went wrong. Checks the structure, the CRC, the payload format ('01') and the mandatory
 * objects (a merchant account, 52, 53, 58, 59, 60).
 */
export function parseMerchantQr(payload: string, options: { exponent?: number } = {}): MerchantQrParseResult {
  const text = payload.trim();
  if (!text) return fail('empty', 'The code is empty.');
  if (lengthOf(text) > EMV_QR_MAX_LENGTH) return fail('malformed', 'The code is too long to be a merchant QR.');
  let objects: EmvTlv[];
  try { objects = parseTlv(text); } catch { return fail('malformed', 'This is not a merchant payment QR code.'); }
  const last = objects[objects.length - 1];
  if (!last || last.id !== '63' || last.value.length !== 4) return fail('malformed', 'The code has no checksum.');
  if (!verifyMerchantQrCrc(text)) return fail('crc', 'The code is damaged: its checksum does not match.');
  const get = (id: string) => objects.find((o) => o.id === id)?.value ?? null;
  const payloadFormat = get('00');
  if (objects[0]?.id !== '00' || payloadFormat !== '01') return fail('format', 'The code uses an unknown payload format.');
  const merchantAccounts: EmvMerchantAccount[] = objects
    .filter((o) => Number(o.id) >= 2 && Number(o.id) <= 51)
    .map((o) => {
      if (Number(o.id) < 26 || !o.children) return { id: o.id, value: o.value };
      const fields: Record<string, string> = {};
      for (const child of o.children) if (child.id !== '00') fields[child.id] = child.value;
      return { id: o.id, guid: o.children.find((c) => c.id === '00')?.value ?? '', fields, value: o.value };
    });
  const currencyNumeric = get('53');
  const required: readonly [unknown, string][] = [[merchantAccounts.length || null, 'merchant account'], [get('52'), 'merchant category'], [currencyNumeric, 'currency'], [get('58'), 'country'], [get('59'), 'merchant name'], [get('60'), 'merchant city']];
  for (const [value, what] of required) if (!value) return fail('missing', `The code has no ${what}.`);
  const known = Object.entries(CURRENCIES).find(([, [numeric]]) => numeric === currencyNumeric);
  const scale = options.exponent ?? known?.[1][1] ?? 2;
  const toMinor = (raw: string | null): bigint | null | undefined => {
    if (raw === null) return null;
    if (!/^\d+(?:\.\d*)?$/.test(raw)) return undefined;
    try { return parseMinorUnits(raw.replace(/\.$/, ''), scale); } catch { return undefined; }
  };
  const amountRaw = get('54');
  const amount = toMinor(amountRaw);
  if (amount === undefined) return fail('amount', 'The amount in the code is not a valid amount.');
  const tipKind = get('55');
  let tip: EmvTip | null = null;
  if (tipKind === '01') tip = { type: 'prompt' };
  else if (tipKind === '02') {
    const fee = toMinor(get('56'));
    if (fee === undefined || fee === null) return fail('amount', 'The fee in the code is not a valid amount.');
    tip = { type: 'fixed', fee };
  } else if (tipKind === '03' && get('57')) tip = { type: 'percentage', percent: get('57')! };
  const initiation = get('01');
  const extra = objects.find((o) => o.id === '62')?.children ?? [];
  const additionalData: EmvAdditionalData = {};
  for (const [key, sub] of ADDITIONAL) {
    const value = extra.find((c) => c.id === sub)?.value;
    if (value !== undefined) additionalData[key] = value;
  }
  const alt = objects.find((o) => o.id === '64')?.children;
  const altName = alt?.find((c) => c.id === '01')?.value;
  const altCity = alt?.find((c) => c.id === '02')?.value;
  return {
    ok: true,
    value: {
      payloadFormat: payloadFormat!,
      pointOfInitiation: initiation === '11' ? 'static' : initiation === '12' ? 'dynamic' : null,
      merchantAccounts,
      merchantCategoryCode: get('52'),
      currencyNumeric,
      currency: known?.[0] ?? null,
      amount,
      amountText: amountRaw,
      tip,
      countryCode: get('58'),
      merchantName: get('59'),
      merchantCity: get('60'),
      postalCode: get('61'),
      additionalData,
      alternateLanguage: alt && altName ? { language: alt.find((c) => c.id === '00')?.value ?? '', merchantName: altName, ...(altCity ? { merchantCity: altCity } : {}) } : null,
      objects,
    },
  };
}
