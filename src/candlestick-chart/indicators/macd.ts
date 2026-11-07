import { macd } from '../../chart-math/indicators.ts';
import { IndicatorPaneView } from '../IndicatorPaneView.tsx';
import type { ChartIndicator } from '../indicatorTypes.ts';

export interface MacdIndicatorOptions {
  fast?: number;
  slow?: number;
  signal?: number;
  /** Pane title. Default "MACD 12, 26, 9". */
  label?: string;
  /** Names of the lines and the spoken position. Default "MACD", "Signal", "Histogram". */
  labels?: { macd?: string; signal?: string; histogram?: string; above?: string; below?: string };
}

/**
 * MACD in its own pane: the MACD line, the signal line (dashed) and the histogram bars, around a zero line. The
 * readout says whether MACD is above or below its signal. Computed by `macd` in chart-math.
 *
 * @stability beta
 */
export function macdIndicator({ fast = 12, slow = 26, signal = 9, label, labels }: MacdIndicatorOptions = {}): ChartIndicator {
  const name = label ?? `MACD ${fast}, ${slow}, ${signal}`;
  const L = { macd: labels?.macd ?? 'MACD', signal: labels?.signal ?? 'Signal', histogram: labels?.histogram ?? 'Histogram' };
  return {
    id: `macd-${fast}-${slow}-${signal}`,
    label: name,
    placement: 'pane',
    view: IndicatorPaneView,
    compute: (candles) => {
      const r = macd(candles.map((c) => c.close), fast, slow, signal);
      return {
        lines: [
          { key: 'histogram', label: L.histogram, values: r.histogram, style: 'histogram' },
          { key: 'macd', label: L.macd, values: r.macd },
          { key: 'signal', label: L.signal, values: r.signal, dash: '5 3' },
        ],
        levels: [{ value: 0, label: '0' }],
      };
    },
    describe: (at) => {
      const h = at.histogram;
      if (h === null || h === undefined) return '';
      return h > 0 ? (labels?.above ?? 'MACD above signal') : h < 0 ? (labels?.below ?? 'MACD below signal') : '';
    },
  };
}
