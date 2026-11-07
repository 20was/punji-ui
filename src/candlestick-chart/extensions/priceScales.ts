import { exactText, logTicks, niceTicks, priceTransform, rebase, rebaseOnto } from '../../chart-math/chartMath.ts';
import type { CandlestickScale, CompareLine, PriceScalesEngine } from '../extensionTypes.ts';
import { candlestickTrading } from '../trading.tsx';

const COMPARE_DASH = ['', '6 3', '2 3', '8 3 2 3'];
const NAMES: Record<CandlestickScale, string> = { linear: 'linear', log: 'logarithmic', percent: 'percent change from the first close', indexed: 'indexed to 100 at the first close' };
const signed = (v: number) => `${v > 0 ? '+' : ''}${exactText(v, 2, 2)}%`;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * The log, percent and indexed price axes and compare lines for `CandlestickChart` (`scales={priceScales}` with
 * `scale` and `compare`). Percent and indexed are measured from the first close shown (Lightweight Charts'
 * Percentage and IndexedTo100 modes); log uses 1, 2, 5 ticks per decade. A scale the prices cannot support falls back
 * to linear and says so. With `compare`, a linear or log axis becomes percent, and each compared series continues
 * from where the price stood on its first shared date (`rebaseOnto`).
 *
 * @stability beta
 */
export const priceScales: PriceScalesEngine = {
  engine: candlestickTrading,
  resolve: ({ scale, base, allPositive, compared, labels }) => {
    const wanted: CandlestickScale = compared && (scale === 'linear' || scale === 'log') ? 'percent' : scale;
    const ok = wanted === 'linear' || (wanted === 'log' ? allPositive : base > 0);
    const notes: string[] = [];
    if (!ok) notes.push(labels?.scaleFallback ?? 'This scale needs prices above zero; showing a linear scale.');
    else if (compared && wanted !== scale) notes.push(labels?.compareNote ?? 'Comparing: the axis shows percent change from the first close.');
    return { scale: ok ? wanted : 'linear', notes };
  },
  transform: priceTransform,
  ticks: (scale, lo, hi, count, formatPrice) => {
    if (scale === 'log') {
      const t = logTicks(10 ** lo, 10 ** hi, count);
      return { tickT: t.ticks.map((v) => Math.log10(v)), loT: Math.log10(t.lo), hiT: Math.log10(t.hi), text: t.ticks.map(formatPrice) };
    }
    const t = niceTicks(lo, hi, count);
    return { tickT: t.ticks, loT: t.lo, hiT: t.hi, text: t.ticks.map((v) => (scale === 'percent' ? signed(v) : scale === 'indexed' ? exactText(v, 2) : formatPrice(v))) };
  },
  text: (scale, v) => (scale === 'percent' ? signed(v) : exactText(v, 2, 2)),
  name: (scale, labels) => labels?.scales?.[scale] ?? NAMES[scale],
  compare: (series, sessions, ends, scale) => {
    if (scale !== 'percent' && scale !== 'indexed') return [];
    const mainPct = rebase(sessions.map((s) => s.close));
    const inScale = (v: number | null) => (v === null ? null : scale === 'indexed' ? 100 + v : v);
    return series.map((s, k): CompareLine => {
      const byDate = new Map<string, number | null>();
      for (const p of s.points) byDate.set(p.date, isNum(p.close) ? p.close : null);
      const pct = rebaseOnto(sessions.map((x) => byDate.get(x.date) ?? null), mainPct);
      return { label: s.label, dash: COMPARE_DASH[k % COMPARE_DASH.length]!, all: pct.map(inScale), values: ends.map((e) => inScale(pct[e] ?? null)) };
    });
  },
};
