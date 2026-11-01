/**
 * ISO 4217 active currency data: alphabetic code, numeric code and minor units (the number of decimals), for the
 * currencies in circulation (List One, amendments through 2026: ZWG replaced ZWL, XCG replaced ANG, SLE replaced
 * SLL, and BGN went with Bulgaria's move to the euro on 1 January 2026). Funds, precious metals and testing codes
 * (XAU, XDR, XTS, BOV, CLF...) are left out. A separate subpath, `@punji/ui/money/iso4217`, so the ~1.5 kB of data
 * loads only where a page needs it (a dynamic import of that subpath).
 *
 * Minor units here are ISO's. Intl (CLDR) disagrees for a few currencies where the smallest coin is out of use
 * (ISO IQD 3, CLDR 0); pass `exponent: isoMinorUnits(code)` to `createMoneyFormatter` when your ledger uses ISO's.
 * Names come from Intl.DisplayNames in the reader's language, not from a table.
 */

export interface Iso4217Currency {
  /** Alphabetic code, 'NPR'. */
  readonly code: string;
  /** Numeric code as three digits, '524'. */
  readonly numeric: string;
  /** Minor-unit digits: 0 (JPY), 2 (USD), 3 (KWD) or 4 (UYW). */
  readonly minorUnits: number;
}

// Code, numeric, minor units. Compact on purpose: parsed once, on first use.
const DATA =
  'AED784,AFN971,ALL008,AMD051,AOA973,ARS032,AUD036,AWG533,AZN944,BAM977,BBD052,BDT050,BHD0483,BIF1080,BMD060,BND096,' +
  'BOB068,BRL986,BSD044,BTN064,BWP072,BYN933,BZD084,CAD124,CDF976,CHF756,CLP1520,CNY156,COP170,CRC188,CUP192,CVE132,' +
  'CZK203,DJF2620,DKK208,DOP214,DZD012,EGP818,ERN232,ETB230,EUR978,FJD242,FKP238,GBP826,GEL981,GHS936,GIP292,GMD270,' +
  'GNF3240,GTQ320,GYD328,HKD344,HNL340,HTG332,HUF348,IDR360,ILS376,INR356,IQD3683,IRR364,ISK3520,JMD388,JOD4003,' +
  'JPY3920,KES404,KGS417,KHR116,KMF1740,KPW408,KRW4100,KWD4143,KYD136,KZT398,LAK418,LBP422,LKR144,LRD430,LSL426,' +
  'LYD4343,MAD504,MDL498,MGA969,MKD807,MMK104,MNT496,MOP446,MRU929,MUR480,MVR462,MWK454,MXN484,MYR458,MZN943,NAD516,' +
  'NGN566,NIO558,NOK578,NPR524,NZD554,OMR5123,PAB590,PEN604,PGK598,PHP608,PKR586,PLN985,PYG6000,QAR634,RON946,RSD941,' +
  'RUB643,RWF6460,SAR682,SBD090,SCR690,SDG938,SEK752,SGD702,SHP654,SLE925,SOS706,SRD968,SSP728,STN930,SVC222,SYP760,' +
  'SZL748,THB764,TJS972,TMT934,TND7883,TOP776,TRY949,TTD780,TWD901,TZS834,UAH980,UGX8000,USD840,UYU858,UYW9274,UZS860,' +
  'VED926,VES928,VND7040,VUV5480,WST882,XAF9500,XCD951,XCG532,XOF9520,XPF9530,YER886,ZAR710,ZMW967,ZWG924';

let table: Map<string, Iso4217Currency> | null = null;
function load(): Map<string, Iso4217Currency> {
  if (table) return table;
  table = new Map();
  for (const entry of DATA.split(',')) {
    // Six characters (code + numeric) means the common 2 decimals; a seventh digit gives the minor units.
    const code = entry.slice(0, 3);
    table.set(code, Object.freeze({ code, numeric: entry.slice(3, 6), minorUnits: entry.length > 6 ? Number(entry[6]) : 2 }));
  }
  return table;
}

/** The ISO 4217 entry for a code (any case), or undefined for an unknown, withdrawn or fund code. */
export function getIso4217(code: string): Iso4217Currency | undefined {
  return load().get(code.toUpperCase());
}

/** The entry for a numeric code ('524' or 524), or undefined. */
export function getIso4217ByNumeric(numeric: string | number): Iso4217Currency | undefined {
  const key = String(numeric).padStart(3, '0');
  for (const entry of load().values()) if (entry.numeric === key) return entry;
  return undefined;
}

/** Every active currency, sorted by code. */
export function listIso4217(): readonly Iso4217Currency[] {
  return [...load().values()];
}

/** True for an active ISO 4217 code (case-insensitive). */
export function isIso4217Code(code: string): boolean {
  return load().has(code.toUpperCase());
}

/** ISO 4217 minor units for a code. Throws a RangeError for an unknown code. */
export function isoMinorUnits(code: string): number {
  const entry = getIso4217(code);
  if (!entry) throw new RangeError(`Not an active ISO 4217 currency: ${code}`);
  return entry.minorUnits;
}

/** The currency's name in a language, from Intl.DisplayNames: currencyName('NPR', 'ne') is 'नेपाली रूपैयाँ'. Falls back to the code. */
export function currencyName(code: string, locale = 'en'): string {
  const upper = code.toUpperCase();
  try {
    return new Intl.DisplayNames([locale], { type: 'currency', fallback: 'code' }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}
