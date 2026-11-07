import { CorrelationMatrix } from '@punji/ui/correlation-matrix';

const names = ['Commercial banks', 'Hydropower', 'Life insurance', 'Microfinance', 'Hotels'];
const shortNames = ['Banks', 'Hydro', 'Life', 'Micro', 'Hotels'];
// Pairwise correlation of daily returns, -1 to 1. null is a pair without enough overlapping history.
const values = [
  [1, 0.62, 0.81, 0.88, 0.35],
  [0.62, 1, 0.55, 0.47, -0.12],
  [0.81, 0.55, 1, 0.74, null],
  [0.88, 0.47, 0.74, 1, 0.29],
  [0.35, -0.12, null, 0.29, 1],
];

export default function Example() {
  return <CorrelationMatrix names={names} shortNames={shortNames} values={values} caption="How closely sectors moved together, daily returns" defaultSelected={0} noneLabel="Not enough shared history" testId="corr" />;
}
