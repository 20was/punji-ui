import { vwap } from '../../chart-math/indicators.ts';
import { IndicatorPaneView } from '../IndicatorPaneView.tsx';
import type { ChartIndicator } from '../indicatorTypes.ts';

export interface VwapIndicatorOptions {
  /** 'price' (default): drawn over the candles. 'pane': in its own pane. */
  placement?: 'price' | 'pane';
  /** Legend and pane title. Default "VWAP". */
  label?: string;
  /** Spoken position of the close against it. */
  labels?: { above?: string; below?: string };
}

/**
 * Volume-weighted average price, running from the first session shown (typical price (high + low + close) / 3
 * weighted by volume). Needs volumes; a series without any draws nothing. Computed by `vwap` in chart-math.
 *
 * @stability beta
 */
export function vwapIndicator({ placement = 'price', label, labels }: VwapIndicatorOptions = {}): ChartIndicator {
  const name = label ?? 'VWAP';
  return {
    id: 'vwap',
    label: name,
    placement,
    view: placement === 'pane' ? IndicatorPaneView : undefined,
    compute: (candles) => ({ lines: [{ key: 'vwap', label: name, values: vwap(candles) }] }),
    describe: (at, c) => {
      const v = at.vwap;
      if (v === null || v === undefined) return '';
      return c.close > v ? (labels?.above ?? 'close above VWAP') : c.close < v ? (labels?.below ?? 'close below VWAP') : '';
    },
  };
}
