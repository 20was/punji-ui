import { cagr, dividendYield, percentageChange, returnOnCost, weightedAverage } from '@punji/ui/calculations';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';

// Ratios return a number, or null when the answer is undefined (a zero base): show a dash, never 0%.
const show = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);

export default function Example() {
  // Rs 1,00,000 invested in NABIL, now worth Rs 1,25,000 after 5 years, with Rs 5,000 of dividends a year.
  const buyPrices = [
    { value: 480, weight: 100 },
    { value: 520, weight: 300 },
  ];
  return (
    <Card title="NABIL performance" description="Rs 1,00,000 invested five years ago" headingLevel={3}>
      <DataRows label="Ratios">
        <DataRow label="Gain since purchase" value={show(returnOnCost(25_000, 100_000))} />
        <DataRow label="Yearly growth (CAGR)" value={show(cagr(100_000, 125_000, 5))} />
        <DataRow label="Dividend yield on cost" value={show(dividendYield(5_000, 100_000))} />
        <DataRow label="Today vs yesterday" value={show(percentageChange(487.5, 481.5))} />
        <DataRow label="Change from a zero base" value={show(percentageChange(5, 0))} />
        <DataRow label="Average buy price" value={`Rs ${weightedAverage(buyPrices)}`} />
      </DataRows>
    </Card>
  );
}
