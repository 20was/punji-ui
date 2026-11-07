import { Card } from '@punji/ui/card';
import { klineStyles, readChartTokens, watchChartTheme, type PunjiChartTokens } from '@punji/ui/klinecharts';
import { DataRow, DataRows } from '@punji/ui/rows';
import { useEffect, useRef, useState } from 'react';

// KLineChart is not loaded on this page: this is the adapter's theme, read from this page's tokens. Change the theme
// and the colours follow; in your app the wrapper re-applies them to the chart for you.
export default function Example() {
  const ref = useRef<HTMLDivElement>(null);
  const [tokens, setTokens] = useState<PunjiChartTokens | undefined>();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setTokens(readChartTokens(el));
    read();
    return watchChartTheme(el, read);
  }, []);
  const styles = tokens ? (klineStyles(tokens) as { candle: { bar: Record<string, string> }; grid: { horizontal: { color: string } }; yAxis: { tickText: { color: string } } }) : undefined;
  return (
    <div ref={ref}>
      <Card title="Styles from tokens" description="Passed to klinecharts as init options; set again when the theme changes." headingLevel={3}>
        <DataRows label="Chart colours read from this page" flush>
          <DataRow label="Rising candle" value={styles?.candle.bar.upColor ?? '…'} />
          <DataRow label="Falling candle" value={styles?.candle.bar.downColor ?? '…'} />
          <DataRow label="Grid line" value={styles?.grid.horizontal.color ?? '…'} />
          <DataRow label="Axis text" value={styles?.yAxis.tickText.color ?? '…'} />
        </DataRows>
      </Card>
    </div>
  );
}
