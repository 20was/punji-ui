import { DivergingBar } from '@punji/ui/bars';
import { holdings } from '../../sample.ts';

// One shared max so rows compare. The printed figure carries the sign; the bar is left or right of a drawn centre line.
const max = Math.max(...holdings.map((h) => Math.abs(h.change)));

export default function Example() {
  return (
    <table className="doc-table">
      <caption className="kit-sr">Day change by holding</caption>
      <thead>
        <tr>
          <th scope="col">Symbol</th>
          <th scope="col">Change</th>
          <th scope="col">Bar</th>
        </tr>
      </thead>
      <tbody>
        {holdings.slice(0, 6).map((h) => (
          <tr key={h.symbol}>
            <th scope="row">{h.symbol}</th>
            <td>{`${h.change > 0 ? '+' : ''}${h.change.toFixed(2)}%`}</td>
            <td>
              <DivergingBar value={h.change} max={max} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
