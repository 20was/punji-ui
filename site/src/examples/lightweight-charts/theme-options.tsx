import { Card } from '@punji/ui/card';
import { lightweightChartOptions, lightweightSeriesOptions, readChartTokens, watchChartTheme, type PunjiChartTokens } from '@punji/ui/lightweight-charts';
import { DataRow, DataRows } from '@punji/ui/rows';
import { useEffect, useRef, useState } from 'react';

// The options a chart gets, read from the page's own tokens. Switch the theme in the toolbar and the values follow:
// the wrapper re-applies the same options to the live chart. No chart library is loaded here.
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
  const layout = tokens ? (lightweightChartOptions(tokens).layout as { textColor: string; attributionLogo: boolean }) : undefined;
  const candle = tokens ? (lightweightSeriesOptions('candlestick', tokens) as { upColor: string; downColor: string }) : undefined;
  return (
    <div ref={ref}>
      <Card title="Theme to options" description="Resolved from the active theme." headingLevel={3}>
        <DataRows label="Chart and series options" flush>
          <DataRow label="Text" value={layout?.textColor ?? '...'} />
          <DataRow label="Up candle" value={candle?.upColor ?? '...'} />
          <DataRow label="Down candle" value={candle?.downColor ?? '...'} />
          <DataRow label="Attribution" value={layout ? (layout.attributionLogo ? 'on' : 'off') : '...'} />
        </DataRows>
      </Card>
    </div>
  );
}
