import type { ReactNode } from 'react';
import { Card, CandlestickChart, DepthChart, PerformanceChart } from '@punji/ui';
import { depthAsks, depthBids, nabilCandles, performanceDates, performanceSeries, sampleCandles } from '../../fixtures/market-data.ts';

// Financial chart fixtures. Data from fixtures/market-data.ts (synthetic, deterministic, never live).
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;

const badCandles = [
  { date: '2025-11-09', open: 480, high: 486, low: 478, close: 484, volume: 41_000 },
  { date: '2025-11-10', open: 484, high: 489, low: 483, close: 488, volume: 52_500 },
  { date: '2025-11-11', open: 488, high: 486, low: 484, close: 485, volume: 38_000 },
  { date: '2025-11-12', open: 485, high: 487, low: 481, close: 482, volume: null },
  { date: '2025-11-23', open: 482, high: 490, low: 480, close: 489, volume: 61_200 },
  { date: '2025-11-24', open: 489, high: 489, low: 489, close: 489, volume: 0 },
];

function CandlestickFixture() {
  return (
    <Stack>
      <Card title="Daily, volume and averages"><CandlestickChart testId="vr-candles" label="NABIL daily" candles={nabilCandles} averages={[{ type: 'sma', window: 10 }, { type: 'ema', window: 20 }]} /></Card>
      <Card title="OHLC bars"><CandlestickChart label="NABIL bars" candles={nabilCandles.slice(-30)} variant="bars" volume={false} height={200} /></Card>
      <Card title="Hollow up, red-up"><CandlestickChart label="NABIL hollow" candles={nabilCandles.slice(-30)} hollowUp convention="red-up" height={220} /></Card>
      <Card title="Bad candle, gap on a time axis"><CandlestickChart label="Bad data" candles={badCandles} axis="time" height={200} /></Card>
      <Card title="One candle"><CandlestickChart label="One session" candles={nabilCandles.slice(0, 1)} height={160} /></Card>
      <Card title="Constant price"><CandlestickChart label="No movement" candles={[{ date: '2025-11-13', open: 487.5, high: 487.5, low: 487.5, close: 487.5, volume: 0 }, { date: '2025-11-14', open: 487.5, high: 487.5, low: 487.5, close: 487.5, volume: 0 }]} height={160} /></Card>
      <Card title="Empty"><CandlestickChart label="No sessions" candles={[]} /></Card>
      <Card title="1,500 sessions aggregated"><CandlestickChart label="Six years" candles={sampleCandles(1500, 3)} height={220} /></Card>
    </Stack>
  );
}

function PerformanceFixture() {
  const portfolioOnly = performanceSeries.slice(0, 1);
  return (
    <Stack>
      <Card title="Against NEPSE and Sensitive"><PerformanceChart testId="vr-perf" label="Portfolio against indices" dates={performanceDates} series={performanceSeries} periods={<span>1M · 3M · All</span>} /></Card>
      <Card title="Raw value"><PerformanceChart label="Portfolio value" dates={performanceDates} series={portfolioOnly} normalize={false} height={200} formatValue={(v) => `Rs ${new Intl.NumberFormat('en-IN').format(v)}`} /></Card>
      <Card title="Red-up"><PerformanceChart label="Portfolio, red-up" dates={performanceDates} series={portfolioOnly} convention="red-up" height={200} /></Card>
      <Card title="Benchmark that starts later"><PerformanceChart label="Portfolio against an index listed mid-period" dates={performanceDates.slice(0, 30)} height={200} series={[
        { key: 'p', label: 'Portfolio', values: performanceSeries[0]!.values.slice(0, 30) },
        { key: 'n', label: 'New index', values: performanceSeries[1]!.values.slice(0, 30).map((v, i) => (i < 14 ? null : v)) },
      ]} /></Card>
      <Card title="One date"><PerformanceChart label="One date" dates={['2025-11-14']} series={[{ key: 'a', label: 'Portfolio', values: [1_000_000] }]} height={160} /></Card>
      <Card title="Flat"><PerformanceChart label="Flat" dates={performanceDates.slice(0, 10)} series={[{ key: 'a', label: 'Cash', values: performanceDates.slice(0, 10).map(() => 500_000) }]} height={160} /></Card>
      <Card title="Empty"><PerformanceChart label="Nothing yet" dates={[]} series={[]} /></Card>
    </Stack>
  );
}

function DepthFixture() {
  return (
    <Stack>
      <Card title="Ten levels a side"><DepthChart testId="vr-depth" label="NABIL depth" bids={depthBids} asks={depthAsks} /></Card>
      <Card title="Only bids"><DepthChart label="Bids only" bids={depthBids} asks={[]} height={160} /></Card>
      <Card title="Crossed book"><DepthChart label="Crossed" bids={[{ price: 489, quantity: 800 }, { price: 488, quantity: 1500 }]} asks={[{ price: 488.5, quantity: 600 }, { price: 490, quantity: 900 }]} height={160} /></Card>
      <Card title="One level a side"><DepthChart label="One level" bids={[{ price: 487, quantity: 1200 }]} asks={[{ price: 488, quantity: 900 }]} height={160} /></Card>
      <Card title="Empty"><DepthChart label="No book" bids={[]} asks={[]} /></Card>
    </Stack>
  );
}

export const chartsRegistry: Record<string, () => ReactNode> = {
  'candlestick-chart': CandlestickFixture,
  'performance-chart': PerformanceFixture,
  'depth-chart': DepthFixture,
};
