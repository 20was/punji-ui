import { decimalsOf, exactText, heikinAshi } from '../../chart-math/chartMath.ts';
import type { CandlestickTransform } from '../extensionTypes.ts';
import { candlestickTrading } from '../trading.tsx';

/**
 * Heikin Ashi for `CandlestickChart` (`transform={heikinAshiTransform}` with `mode="heikin-ashi"`): the candles are
 * replaced by `heikinAshi()` of chart-math (TradingView's construction rules). The table and readout print its values
 * to two more decimals than the prices were written with, never rounded to the currency's two, and the readout adds
 * the actual close.
 *
 * @stability beta
 */
export const heikinAshiTransform: CandlestickTransform = {
  engine: candlestickTrading,
  id: 'heikin-ashi',
  label: 'Heikin Ashi',
  apply: (candles) => heikinAshi(candles).map((h, k) => ({ date: candles[k]!.date, ...h })),
  format: (candles) => {
    const d = candles.reduce((m, c) => Math.max(m, decimalsOf(c.open, 6), decimalsOf(c.high, 6), decimalsOf(c.low, 6), decimalsOf(c.close, 6)), 0);
    return (v) => exactText(v, d + 2, d);
  },
};
