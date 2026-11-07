import { Card } from '@punji/ui/card';
import { moneyAxisFormatter, moneyTooltipFormatter, punjiEChartsTheme, readChartTokens, watchChartTheme, type PunjiChartTokens } from '@punji/ui/echarts';
import { DataRow, DataRows } from '@punji/ui/rows';
import { useEffect, useRef, useState } from 'react';

// ECharts is not loaded on this page: these are the adapter's own theme and formatters, called by hand. In your app
// pass the theme to echarts.init (the wrapper does) and the formatters in your option.
const money = { currency: 'NPR', locale: 'en-IN', display: 'code' } as const;
const axis = moneyAxisFormatter(money);
const tip = moneyTooltipFormatter(money);

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
  const theme = tokens ? (punjiEChartsTheme(tokens) as { color: string[]; textStyle: { color: string } }) : undefined;
  return (
    <div ref={ref}>
      <Card title="Theme and money formatters" description="Palette from the active theme; amounts in minor units." headingLevel={3}>
        <DataRows label="Theme and formatters" flush>
          <DataRow label="Text" value={theme?.textStyle.color ?? '...'} />
          <DataRow label="First series" value={theme?.color[0] ?? '...'} />
          <DataRow label="Axis" value={axis(25_000_000)} />
          <DataRow label="Tooltip" value={tip({ seriesName: 'Net', value: ['Q1', 123456789] }).replace(/<[^>]+>/g, '')} />
        </DataRows>
      </Card>
    </div>
  );
}
