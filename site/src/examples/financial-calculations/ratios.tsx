import { percentageChange, returnOnCost, cagr, dividendYield, weightedAverage } from '@punji/ui/calculations';

const show = (value: number | null) => (value === null ? 'null (undefined)' : `${value.toFixed(2)}%`);

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>percentageChange(110, 100)</dt><dd>{show(percentageChange(110, 100))}</dd></div>
      <div><dt>percentageChange(5, 0)</dt><dd>{show(percentageChange(5, 0))}</dd></div>
      <div><dt>returnOnCost(250, 1000)</dt><dd>{show(returnOnCost(250, 1000))}</dd></div>
      <div><dt>cagr(1000, 2000, 5 years)</dt><dd>{show(cagr(1000, 2000, 5))}</dd></div>
      <div><dt>dividendYield(25, 500)</dt><dd>{show(dividendYield(25, 500))}</dd></div>
      <div>
        <dt>weightedAverage</dt>
        <dd>{weightedAverage([{ value: 10, weight: 1 }, { value: 20, weight: 3 }])}</dd>
      </div>
    </dl>
  );
}
