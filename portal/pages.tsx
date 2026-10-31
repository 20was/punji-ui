import { useMemo, useState, type ReactNode } from 'react';
import { Button, Field, Select } from '@punji/ui';
import { Page, Section, Demo, RefTable as PortalRefTable } from '@punji/portal-parts';
import { formatNPR, formatNepalNumber, formatPercent, formatChange, formatBasisPoints, formatPrice, formatQuantity, formatMinorUnits, createFinancialFormatters, parseLocalizedDecimal, parseMinorUnits, minorUnitsToDecimal, sumMinorUnits, parseCalendarDate, formatCalendarDate, formatDateRange, gregorianToBS, bsToGregorian, instantToNepalDate, formatNepalDate, formatBSDate, nepalFiscalYear, getNepalFiscalPeriod, BS_MONTHS, BS_SUPPORTED_RANGE, NEPAL_TIME_ZONE } from '@punji/package-utilities';
import { useMediaQuery } from '@punji/package-media';
import { useHydrated } from '@punji/package-hydrated';
import { useStableOrder, keepOrder } from '@punji/package-order';


function RefTable({head,rows,label}: {head:string[];rows:ReactNode[][];label:string}) {
  return <PortalRefTable head={head} label={label} rows={rows.map(row=>row.map((cell,index)=>index===0 && typeof cell==='string'?<code key={index} className="ds-type">{cell}</code>:cell))}/>;
}

const show = (value: unknown): string => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? `${item}n` : item, 2);
function attempt(fn: () => unknown): string { try { const value = fn(); return typeof value === 'string' ? value : show(value); } catch (error) { return error instanceof Error ? error.message : 'Invalid value'; } }
function API({ rows }: { rows: string[][] }) { return <RefTable label="API contracts" head={['Export and import subpath','Contract']} rows={rows}/>; }
function Contracts({children}: {children: ReactNode}) { return <Section id="contracts" title="Behaviour and edge cases">{children}</Section>; }

export function FinancialFormattersPage() {
  const [raw,setRaw]=useState('123456789');
  const [marketRaw,setMarketRaw]=useState('-0.004');
  const [digits,setDigits]=useState<'latn'|'deva'>('latn');
  const [language,setLanguage]=useState<'en'|'ne'>('en');
  const factory=useMemo(()=>createFinancialFormatters({language,digits}),[language,digits]);
  return <Page path="/utilities/financial-formatters" lead="Format display numbers and exact monetary amounts. Whole rupees and integer paisa have separate APIs so precision and units stay explicit.">
    <Section id="examples" title="Working examples"><Demo layout="col" title="Exact minor units" code={"import { formatMinorUnits, createFinancialFormatters } from '@punji/ui/nepal/financial-format';\nformatMinorUnits(123456789n); // NPR 12,34,567.89"}>
      <Field label="Amount in paisa (integer)" value={raw} onChange={setRaw} testId="docs-minor-input"/>
      <Select label="Digits" labelPlacement="above" value={digits} onChange={setDigits} options={[{value:'latn',label:'Western'},{value:'deva',label:'Devanagari'}]}/>
      <Select label="Language" labelPlacement="above" value={language} onChange={setLanguage} options={[{value:'en',label:'English'},{value:'ne',label:'नेपाली'}]}/>
      <output data-testid="docs-minor-output">{attempt(()=>{if(!/^-?\d{1,50}$/.test(raw)) throw new Error('Enter an integer amount in paisa');return factory.formatMinorUnits(BigInt(raw));})}</output>
    </Demo><RefTable label="Formatting examples" head={['Call','Result']} rows={[
      ['formatNepalNumber(1234567.89)',formatNepalNumber(1234567.89)],['formatNPR(1234567.89)',formatNPR(1234567.89)],['formatNPR(null)',formatNPR(null)],['formatPercent(5)',formatPercent(5)],['formatMinorUnits(-123n, { accounting: true })',formatMinorUnits(-123n,{accounting:true})],['Huge exact amount',formatMinorUnits(900719925474099399n)],
    ]}/><div id="market-formatters"><Demo layout="col" title="Changes, basis points, prices and quantities" code={"import { formatChange, formatBasisPoints, formatPrice, formatQuantity } from '@punji/ui/nepal/market-format';\nformatChange(1.25, { unit: 'percent' }); // +1.25%\nformatBasisPoints(25); // 25 bps\nformatQuantity(1234); // 1,234\nformatPrice(540.5); // 540.50"}>
      <Field label="Display value (up to six decimal places)" value={marketRaw} onChange={setMarketRaw} testId="docs-market-input"/>
      <output data-testid="docs-market-output">{attempt(()=>{
        const parsed=parseLocalizedDecimal(marketRaw,{maxFractionDigits:6});
        if(parsed.state!=='valid')throw new Error('Enter a valid decimal display value');
        const value=Number(parsed.value);
        if(!Number.isFinite(value))throw new Error('Enter a finite display value');
        return `Change: ${formatChange(value,{digits,unit:'percent'})} · Basis points: ${formatBasisPoints(value,{digits,signed:true})} · Price: ${formatPrice(value,{digits})} · Quantity: ${formatQuantity(value,{digits})}`;
      })}</output>
    </Demo></div><RefTable label="Market formatting examples" head={['Call','Result']} rows={[
      ["formatChange(1.255, { unit: 'percent' })",formatChange(1.255,{unit:'percent'})],
      ['formatChange(-0.004)',formatChange(-0.004)],
      ['formatBasisPoints(25)',formatBasisPoints(25)],
      ["formatBasisPoints(-25, { signed: true })",formatBasisPoints(-25,{signed:true})],
      ["formatQuantity(12.345, { fractionDigits: 3 })",formatQuantity(12.345,{fractionDigits:3})],
      ["formatPrice(540.5, { currency: 'NPR' })",formatPrice(540.5,{currency:'NPR'})],
      ['formatPrice(null)',formatPrice(null)],
    ]}/></Section>
    <Section id="api" title="API reference"><API rows={[
      ['formatChange(value, options) · nepal/market-format','Signed number or percentage-point display. unit: number (default) or percent; two decimals by default. Rounded zero has no sign.'],
      ['formatBasisPoints(value, options) · nepal/market-format','Input already in bps; no conversion. Zero decimals by default. signed opts into a + sign.'],
      ['formatQuantity(value, options) · nepal/market-format','Whole units by default; fractionDigits opts into fractional units. Number or whole-unit bigint.'],
      ['formatPrice(value, options) · nepal/market-format','Two decimals by default; explicit fractionDigits and optional currency label. No tick-size validation.'],
      ['formatNepalNumber(value, options) · nepal/format','number | bigint | null | undefined; language, digits, fractionDigits (0–20), missing. Bigint means whole units.'],
      ['formatNPR(value, options) · nepal/format','Whole rupees, two decimals by default; NPR / रु label. Missing/nonfinite values use the missing marker.'],
      ['formatPercent(value, options) · nepal/format','Percentage points: 5 means 5%, not 500%.'],
      ['formatMinorUnits(value, options) · nepal/financial-format','bigint minor units; scale 0–9 (default 2), language, digits, currency display label, accounting. No rounding or FX.'],
      ['createFinancialFormatters(options) · nepal/financial-format','Returns a frozen object with formatMinorUnits; reuses native Intl instances.'],
    ]}/></Section>
    <Contracts><p>Market formatters use half-expand display rounding. Positive changes have +, negatives have −, and values rounded to zero have no sign. Percent values are percentage points; basis-point inputs are already bps (25 bps equals 0.25 percentage points). No formatter converts between these units. Quantity and price precision are caller-controlled; they do not validate an order, calculate a return or recompute a published change.</p><p>Western digits remain the default in both languages. Use Devanagari explicitly. Missing is distinct from zero. The factory and exact formatter never convert bigint amounts through Number. Currency is a display label; scale must be supplied for currencies whose minor-unit exponent differs from two.</p><p>These pure utilities need no React or stylesheet import. The existing calendar dependency is not loaded by the granular formatting subpaths.</p></Contracts>
  </Page>;
}

export function DecimalInputPage() {
  const [raw,setRaw]=useState('१२,३४५.६७');
  const parsed=parseLocalizedDecimal(raw);
  return <Page path="/utilities/decimal-input" lead="Keep editable text, validation and exact money separate. Parse English or Devanagari decimal input into a canonical string before committing it as bigint minor units.">
    <Section id="examples" title="Working examples"><Demo layout="col" title="Try a valid, partial or invalid amount" code={"import { parseLocalizedDecimal } from '@punji/ui/nepal/decimal';\nimport { parseMinorUnits } from '@punji/ui/nepal/money';\nconst parsed = parseLocalizedDecimal('१२,३४५.६७');\nif (parsed.state === 'valid') parseMinorUnits(parsed.value); // 1234567n"}>
      <Field label="Decimal input" value={raw} onChange={setRaw} testId="docs-decimal-input"/>
      <output data-testid="docs-decimal-output">{show(parsed)}</output>
      <p>Minor units: {parsed.state==='valid'?String(parseMinorUnits(parsed.value)):'Not committed'}</p>
    </Demo><RefTable label="Exact money examples" head={['Call','Result']} rows={[
      ["parseLocalizedDecimal('-')",show(parseLocalizedDecimal('-'))], ["parseLocalizedDecimal('1,234,567')",show(parseLocalizedDecimal('1,234,567'))], ["parseLocalizedDecimal('1.001')",show(parseLocalizedDecimal('1.001'))], ["parseMinorUnits('0.10') + parseMinorUnits('0.20')",String(sumMinorUnits([parseMinorUnits('0.10'),parseMinorUnits('0.20')]))+'n'],['minorUnitsToDecimal(30n)',minorUnitsToDecimal(30n)],
    ]}/></Section>
    <Section id="api" title="API reference"><API rows={[
      ['parseLocalizedDecimal(text, options) · nepal/decimal',"Returns empty, partial, invalid (reason), or valid (canonical value). maxFractionDigits 0–9; grouping: south-asian (default), western or none."],
      ['parseMinorUnits(text, scale=2) · nepal/money','Ungrouped ASCII decimal → bigint; scale 0–9. Rejects excess precision, exponents, grouping and malformed input.'],
      ['minorUnitsToDecimal(value, scale=2) · nepal/money','bigint → exact ungrouped decimal string with fixed precision.'],
      ['sumMinorUnits(values) · nepal/money','Sums readonly bigint values. Caller must ensure one currency and scale.'],
    ]}/></Section>
    <Contracts><p>Try empty text, a minus sign, 12., 1.001, 1,23,456.78 and 1,234,567. Surrounding whitespace is trimmed; internal whitespace, currency symbols, plus signs, Unicode minus and accounting parentheses are rejected. Negative zero is normalized.</p><p>Display text is not storage text. The parser does not remove arbitrary decorations, round excess precision or turn invalid input into zero. JSON requires explicit serialization of bigint.</p></Contracts>
  </Page>;
}

export function CalendarDatesPage() {
  const [start,setStart]=useState('2024-02-29');const [end,setEnd]=useState('2024-03-31');
  return <Page path="/utilities/calendar-dates" lead="A transaction date is a calendar day, not an instant. Strict Gregorian date-only utilities preserve that day across timezones and validate leap years before formatting.">
    <Section id="examples" title="Working examples"><Demo layout="col" title="Date-only parsing and ranges" code={"import { parseCalendarDate, formatCalendarDate, formatDateRange } from '@punji/ui/nepal/date-only';\nparseCalendarDate('2024-02-29');\nformatDateRange('2024-02-29', '2024-03-31');"}>
      <Field label="Start date (YYYY-MM-DD)" value={start} onChange={setStart} testId="docs-date-start"/>
      <Field label="End date (YYYY-MM-DD)" value={end} onChange={setEnd} testId="docs-date-end"/>
      <output data-testid="docs-date-output">{attempt(()=>formatDateRange(start,end))}</output>
      <p>Parsed start: {show(parseCalendarDate(start))}</p>
    </Demo><RefTable label="Date examples" head={['Call','Result']} rows={[
      ["parseCalendarDate('2023-02-29')",show(parseCalendarDate('2023-02-29'))],["formatCalendarDate('2024-02-29')",formatCalendarDate('2024-02-29')],['Nepali Gregorian display',formatCalendarDate('2024-02-29',{language:'ne',digits:'deva'})],['Same-day range',formatDateRange('2024-02-29','2024-02-29')],['Reversed range',attempt(()=>formatDateRange('2025-01-01','2024-01-01'))],
    ]}/></Section>
    <Section id="api" title="API reference"><API rows={[
      ['parseCalendarDate(text) · nepal/date-only','Strict ASCII YYYY-MM-DD; returns Gregorian CalendarDate or null. Years 0001–9999, one-based months.'],
      ['formatCalendarDate(date, options) · nepal/date-only','CalendarDate or strict string; language, digits and month width (numeric, 2-digit, short, long). Invalid values throw RangeError.'],
      ['formatDateRange(start, end, options) · nepal/date-only','Inclusive Gregorian endpoints; equal dates print once, reversed/invalid dates throw.'],
    ]}/></Section>
    <Contracts><p>Whitespace, unpadded fields, timestamps and localized digits are rejected by the storage parser. Formatting uses an explicit Gregorian calendar and UTC surrogate, never the host timezone. Locale controls field order and month names.</p><p>These functions do not perform BS conversion. Use the Nepal calendar page for that. A timestamp needs an explicit timezone policy before choosing its calendar day.</p></Contracts>
  </Page>;
}

export function NepalCalendarPage() {
  const [raw,setRaw]=useState('2021-07-16');
  const result=attempt(()=>{const date=parseCalendarDate(raw);if(!date)throw new Error('Enter a valid Gregorian date');const bs=gregorianToBS(date);const period=getNepalFiscalPeriod(bs);return `${formatBSDate(bs,{language:'ne',digits:'deva'})} · FY ${period.label} · ${formatCalendarDate(period.start.gregorian)} – ${formatCalendarDate(period.end.gregorian)} (inclusive)`;});
  const instant=new Date('2024-04-12T18:15:00Z');
  return <Page path="/utilities/nepal-calendar" lead="Convert Gregorian and Bikram Sambat dates using the existing table-backed converter, with explicit Kathmandu instants and exact inclusive fiscal-year boundaries.">
    <Section id="examples" title="Working examples"><Demo layout="col" title="Convert a Gregorian date and inspect its fiscal period" code={"import { gregorianToBS, getNepalFiscalPeriod } from '@punji/ui/nepal/calendar';\nconst bs = gregorianToBS({ year: 2021, month: 7, day: 16 });\ngetNepalFiscalPeriod(bs); // FY 2078/79"}>
      <Field label="Gregorian date (YYYY-MM-DD)" value={raw} onChange={setRaw} testId="docs-bs-input"/>
      <output data-testid="docs-bs-output">{result}</output>
    </Demo><RefTable label="Nepal calendar examples" head={['Call','Result']} rows={[
      ['bsToGregorian({year:2078,month:4,day:1})',show(bsToGregorian({year:2078,month:4,day:1}))],['nepalFiscalYear({year:2078,month:4,day:1})',show(nepalFiscalYear({year:2078,month:4,day:1}))],['instantToNepalDate at 18:15 UTC',show(instantToNepalDate(instant))],['formatNepalDate(instant)',formatNepalDate(instant)],['Supported BS range',`${BS_SUPPORTED_RANGE.from} to ${BS_SUPPORTED_RANGE.to}`],['Nepali BS months',BS_MONTHS.ne.join(' · ')],['Timezone',NEPAL_TIME_ZONE],
    ]}/></Section>
    <Section id="api" title="API reference"><API rows={[
      ['gregorianToBS / bsToGregorian(date) · nepal/calendar','One-based parts; strict supported-range conversion. Invalid values throw.'],
      ['formatBSDate(bsDate, options) · nepal/calendar','Validates BS date before formatting; language and digits are explicit.'],
      ['instantToNepalDate(instant) · nepal/calendar','Date or epoch milliseconds → Gregorian date in Asia/Kathmandu.'],
      ['nepalFiscalYear(bsDate) · nepal/calendar','Returns startYear, endYear and label for the containing fiscal year.'],
      ['getNepalFiscalPeriod(bsDate) · nepal/calendar','Inclusive start/end, each with BS and Gregorian dates; requires complete converter coverage.'],
      ['formatNepalDate(instant, options) · nepal/format','Gregorian instant display; language, digits, timeZone and includeTime.'],
      ['BS_MONTHS / NEPAL_TIME_ZONE · nepal/format','English/Nepali month constants and the Kathmandu IANA timezone.'],
      ['BS_SUPPORTED_RANGE · nepal/calendar','Supported BS conversion endpoints.'],
    ]}/></Section>
    <Contracts><p>No fixed year offset or manual BS month-length arithmetic is used. A complete fiscal period may be unavailable even when the individual date is convertible: early 1975 BS and FY 2099/2100 extend beyond coverage.</p><p>The converter table is tested for round-trip consistency; that is not independent official certification of every future date. Gregorian formatting and conversion remain separate APIs.</p></Contracts>
  </Page>;
}

const initialRows=[{id:'NABIL',value:540},{id:'NICA',value:410},{id:'UPPER',value:220}];
const rowKey=(row:typeof initialRows[number])=>row.id;
export function UtilityHooksPage() {
  const narrow=useMediaQuery('(max-width: 760px)');const hydrated=useHydrated();
  const [rows,setRows]=useState(initialRows);const [sort,setSort]=useState(0);
  const sorted=rows.toSorted((a,b)=>b.value-a.value);
  const stable=useStableOrder(sorted,rowKey,String(sort));
  return <Page path="/utilities/react-hooks" lead="React hooks for native media queries, hydration and stable live-table ordering. These APIs have no persistence, network client, hard-coded breakpoint or extra dependency.">
    <Section id="examples" title="Working examples"><Demo layout="col" title="Browser state" code={"import { useMediaQuery, useHydrated } from '@punji/ui';\nconst narrow = useMediaQuery('(max-width: 760px)', false);\nconst hydrated = useHydrated();"}>
      <p>Viewport at most 760px: <output>{String(narrow)}</output></p><p>Hydrated: <output>{String(hydrated)}</output></p>
    </Demo><Demo layout="col" title="Live updates keep row positions until you sort again" code={"import { useStableOrder } from '@punji/ui/stable-order';\nconst visibleRows = useStableOrder(sortedRows, row => row.id, sortId);"}>
      <Button onClick={()=>setRows(current=>current.map(row=>({...row,value:760-row.value})))} testId="docs-live-update">Update sample values</Button>
      <Button variant="secondary" onClick={()=>setSort(value=>value+1)} testId="docs-live-sort">Sort again</Button>
      <RefTable label="Stable sample rows" head={['Symbol','Sample value']} rows={stable.map(row=>[row.id,String(row.value)])}/>
      <p>Pure key helper: {show(keepOrder(['a','b'],['b','a']))}</p>
    </Demo></Section>
    <Section id="api" title="API reference"><API rows={[
      ['useMediaQuery(query, serverMatch=false) · use-media-query','SSR/hydration return serverMatch; client follows native matchMedia with subscription cleanup.'],
      ['useHydrated() · use-hydrated','False in server output and initial hydration pass; true after hydration or in client-only rendering.'],
      ['useStableOrder(sorted, keyOf, sortId) · stable-order','Fresh row objects in retained positions; sort ID or membership changes adopt input order.'],
      ['keepOrder(previous, next) · stable-order/keep-order','React-free key helper; unique keys required, duplicates throw.'],
    ]}/></Section>
    <Contracts><p>Update arrays and row objects immutably. Keys must be unique and stable. Change sortId for an explicit re-sort, including a repeated sort on the same column. The hook never sorts, mutates or persists the data itself.</p><p>Use identical serverMatch values on server and client. Prefer CSS for purely visual layout. useHydrated is not a loading state or a reason to hide server-renderable content. The media-query external-store pattern is adapted from MUI under MIT; the published package includes its licence notice.</p></Contracts>
  </Page>;
}
