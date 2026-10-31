/**
 * Market sessions from a caller-supplied schedule. Pure: no React, no browser
 * globals, no network. The schedule (time zone, session windows, holidays) is
 * data the caller owns and keeps current; this module only answers "what is
 * the market doing at this instant, and when does that next change?".
 *
 * Wall-clock times are read in the schedule's IANA time zone with Intl, so
 * daylight saving is the platform's, not ours. A wall time that does not
 * exist (the skipped hour) or exists twice (the repeated hour) resolves to the
 * earlier offset; real exchanges do not schedule sessions in those hours.
 */

export type MarketState = 'open' | 'pre-open' | 'closed' | 'halted' | 'holiday';

export interface SessionWindow {
  /** What the market is doing inside the window. */
  state: 'open' | 'pre-open';
  /** Local weekdays, 0 = Sunday … 6 = Saturday. */
  days: readonly number[];
  /** Local 24-hour times 'HH:mm'. The start is inside the window, the end is not. */
  start: string;
  end: string;
  /** Optional name for the session ("Continuous trading"). */
  label?: string;
}

export interface MarketHoliday {
  /** Local calendar date, 'YYYY-MM-DD'. */
  date: string;
  name?: string;
}

export interface MarketSchedule {
  /** IANA time zone, for example 'Asia/Kathmandu' or 'America/New_York'. */
  timeZone: string;
  sessions: readonly SessionWindow[];
  holidays?: readonly MarketHoliday[];
}

export interface MarketSession {
  state: MarketState;
  /** The session window's label, or the holiday's name, when there is one. */
  label?: string;
  /** The date and time on the exchange's clock at `now`. */
  localDate: string;
  localTime: string;
  /** The next instant the market changes between open, pre-open and closed (within 10 days), or null. A halt is not predictable, so it never appears here. */
  next: { state: Exclude<MarketState, 'halted' | 'holiday'>; at: Date } | null;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, numberingSystem: 'latn', calendar: 'gregory', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f;
}

interface Wall { year: number; month: number; day: number; hour: number; minute: number; weekday: number }
function wallAt(ms: number, timeZone: string): Wall {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(ms)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  const year = parts.year!;
  const month = parts.month!;
  const day = parts.day!;
  return { year, month, day, hour: parts.hour! % 24, minute: parts.minute!, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}
const wallAsUtc = (w: Wall) => Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);

function parseTime(text: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (!m) throw new RangeError(`Expected a 24-hour time 'HH:mm', got '${text}'`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** The instant a local wall time happens on a local date. */
function instantOf(year: number, month: number, day: number, minutes: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  const first = guess - (wallAsUtc(wallAt(guess, timeZone)) - guess);
  const second = guess - (wallAsUtc(wallAt(first, timeZone)) - first);
  return first === second ? first : Math.min(first, second);
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (w: Pick<Wall, 'year' | 'month' | 'day'>) => `${w.year}-${pad(w.month)}-${pad(w.day)}`;

interface Compiled { schedule: MarketSchedule; windows: { state: 'open' | 'pre-open'; days: ReadonlySet<number>; start: number; end: number; label?: string }[]; holidays: Map<string, string | undefined> }
function compile(schedule: MarketSchedule): Compiled {
  formatterFor(schedule.timeZone); // throws RangeError for an unknown zone
  const windows = schedule.sessions.map((s) => {
    const start = parseTime(s.start);
    const end = parseTime(s.end);
    if (end <= start) throw new RangeError(`Session ends ('${s.end}') before it starts ('${s.start}')`);
    for (const d of s.days) if (!Number.isInteger(d) || d < 0 || d > 6) throw new RangeError('Session days are integers 0 (Sunday) to 6 (Saturday)');
    return { state: s.state, days: new Set(s.days), start, end, label: s.label };
  });
  const holidays = new Map<string, string | undefined>();
  for (const h of schedule.holidays ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h.date)) throw new RangeError(`Expected a holiday date 'YYYY-MM-DD', got '${h.date}'`);
    holidays.set(h.date, h.name);
  }
  return { schedule, windows, holidays };
}

type Base = { state: 'open' | 'pre-open' | 'closed' | 'holiday'; label?: string };
function baseAt(c: Compiled, ms: number): Base & { wall: Wall } {
  const wall = wallAt(ms, c.schedule.timeZone);
  const key = dateKey(wall);
  if (c.holidays.has(key)) return { state: 'holiday', label: c.holidays.get(key), wall };
  const minutes = wall.hour * 60 + wall.minute;
  const hit = c.windows.find((w) => w.days.has(wall.weekday) && minutes >= w.start && minutes < w.end);
  return hit ? { state: hit.state, label: hit.label, wall } : { state: 'closed', wall };
}
const settled = (s: Base['state']) => (s === 'holiday' ? 'closed' : s);

/**
 * What the market is doing at `now` under `schedule`.
 *
 * - A date in `holidays` is `holiday` all day, whatever the windows say.
 * - Inside a window the state is that window's; otherwise `closed` (nights, weekends).
 * - `options.halted` turns an `open` or `pre-open` market into `halted`. Halts come from the
 *   exchange, not the clock, so the caller passes them in (for example from a feed).
 *
 * Throws RangeError for an unknown time zone, a malformed time or date, or an invalid `now`.
 */
export function getMarketSession(now: Date | number, schedule: MarketSchedule, options: { halted?: boolean } = {}): MarketSession {
  const ms = typeof now === 'number' ? now : now.getTime();
  if (!Number.isFinite(ms)) throw new RangeError('now must be a valid Date or timestamp');
  const c = compile(schedule);
  const base = baseAt(c, ms);
  const state: MarketState = options.halted && (base.state === 'open' || base.state === 'pre-open') ? 'halted' : base.state;
  const here = settled(base.state);
  let next: MarketSession['next'] = null;
  const origin = Date.UTC(base.wall.year, base.wall.month - 1, base.wall.day);
  const candidates: number[] = [];
  for (let k = 0; k < 10; k += 1) {
    const d = new Date(origin + k * 86_400_000);
    const weekday = d.getUTCDay();
    for (const w of c.windows) {
      if (!w.days.has(weekday)) continue;
      for (const minutes of [w.start, w.end]) {
        const at = instantOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), minutes, schedule.timeZone);
        if (at > ms) candidates.push(at);
      }
    }
  }
  for (const at of candidates.toSorted((a, b) => a - b)) {
    const after = settled(baseAt(c, at).state);
    if (after !== here) { next = { state: after, at: new Date(at) }; break; }
  }
  return { state, label: base.label, localDate: dateKey(base.wall), localTime: `${pad(base.wall.hour)}:${pad(base.wall.minute)}`, next };
}

/**
 * AN EXAMPLE, NOT AUTHORITY. Hours that Nepal Stock Exchange (NEPSE) has used for its equity
 * market: pre-open 10:30 to 11:00 and continuous trading 11:00 to 15:00, Sunday to Thursday,
 * Asia/Kathmandu. The exchange changes its hours and announces holidays by notice. Verify the
 * hours against NEPSE's current notice before relying on this, and supply `holidays` yourself;
 * none are built in.
 */
export const nepseSchedule: MarketSchedule = Object.freeze({
  timeZone: 'Asia/Kathmandu',
  sessions: Object.freeze([
    Object.freeze({ state: 'pre-open' as const, days: Object.freeze([0, 1, 2, 3, 4]), start: '10:30', end: '11:00', label: 'Pre-open' }),
    Object.freeze({ state: 'open' as const, days: Object.freeze([0, 1, 2, 3, 4]), start: '11:00', end: '15:00', label: 'Continuous trading' }),
  ]),
  holidays: Object.freeze([]),
});
