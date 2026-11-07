import { rsi } from '../../chart-math/indicators.ts';
import { IndicatorPaneView } from '../IndicatorPaneView.tsx';
import type { ChartIndicator } from '../indicatorTypes.ts';

export interface RsiIndicatorOptions {
  /** Sessions in the average. Default 14. */
  period?: number;
  /** Overbought line. Default 70. */
  overbought?: number;
  /** Oversold line. Default 30. */
  oversold?: number;
  /** Pane title. Default "RSI 14". */
  label?: string;
  /** Spoken zone words. */
  labels?: { overbought?: string; oversold?: string; neutral?: string };
}

/**
 * Relative Strength Index in its own pane (0 to 100) with the overbought and oversold lines; the readout says the
 * zone in words. Computed by `rsi` in chart-math.
 *
 * @stability beta
 */
export function rsiIndicator({ period = 14, overbought = 70, oversold = 30, label, labels }: RsiIndicatorOptions = {}): ChartIndicator {
  const name = label ?? `RSI ${period}`;
  return {
    id: `rsi-${period}`,
    label: name,
    placement: 'pane',
    view: IndicatorPaneView,
    compute: (candles) => ({
      lines: [{ key: 'rsi', label: name, values: rsi(candles.map((c) => c.close), period) }],
      domain: [0, 100],
      levels: [{ value: oversold, label: String(oversold) }, { value: overbought, label: String(overbought) }],
    }),
    describe: (at) => {
      const v = at.rsi;
      if (v === null || v === undefined) return '';
      return v >= overbought ? (labels?.overbought ?? 'overbought') : v <= oversold ? (labels?.oversold ?? 'oversold') : (labels?.neutral ?? 'neutral');
    },
  };
}
