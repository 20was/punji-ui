import { bollinger } from '../../chart-math/indicators.ts';
import { IndicatorPaneView } from '../IndicatorPaneView.tsx';
import type { ChartIndicator } from '../indicatorTypes.ts';
import { candlestickTrading } from '../trading.tsx';

export interface BollingerIndicatorOptions {
  period?: number;
  /** Standard deviations either side. Default 2. */
  mult?: number;
  /** 'price' (default): drawn over the candles. 'pane': in its own pane. */
  placement?: 'price' | 'pane';
  /** Legend and pane title. Default "Bollinger 20, 2". */
  label?: string;
  /** Names of the lines and the spoken position. */
  labels?: { upper?: string; middle?: string; lower?: string; above?: string; below?: string; within?: string };
}

/**
 * Bollinger Bands: the average and a shaded band of `mult` population standard deviations either side. The readout
 * says whether the close is above, below or within the band. Computed by `bollinger` in chart-math.
 *
 * @stability beta
 */
export function bollingerIndicator({ period = 20, mult = 2, placement = 'price', label, labels }: BollingerIndicatorOptions = {}): ChartIndicator {
  const name = label ?? `Bollinger ${period}, ${mult}`;
  const L = { upper: labels?.upper ?? 'Upper band', middle: labels?.middle ?? 'Middle band', lower: labels?.lower ?? 'Lower band' };
  return {
    engine: candlestickTrading,
    id: `bollinger-${period}-${mult}`,
    label: name,
    placement,
    view: placement === 'pane' ? IndicatorPaneView : undefined,
    compute: (candles) => {
      const r = bollinger(candles.map((c) => c.close), period, mult);
      return {
        lines: [
          { key: 'upper', label: L.upper, values: r.upper },
          { key: 'middle', label: L.middle, values: r.middle, dash: '5 3' },
          { key: 'lower', label: L.lower, values: r.lower },
        ],
        band: { upper: 'upper', lower: 'lower' },
      };
    },
    describe: (at, c) => {
      const u = at.upper;
      const l = at.lower;
      if (u === null || u === undefined || l === null || l === undefined) return '';
      return c.close > u ? (labels?.above ?? 'close above the upper band') : c.close < l ? (labels?.below ?? 'close below the lower band') : (labels?.within ?? 'close within the bands');
    },
  };
}
