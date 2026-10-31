import { Delta, Figure } from '@punji/ui/figures';
import { StatGrid, StatTile } from '@punji/ui/stats';
import { holdings } from '../../sample.ts';

// StatGrid is a description list: each tile is a term and its figure. Totals come from the data, in numbers you format at the edge.
const value = holdings.reduce((sum, h) => sum + h.qty * h.ltp, 0);
const dayChange = holdings.reduce((sum, h) => sum + h.qty * h.ltp * (h.change / 100), 0);
const gainers = holdings.filter((h) => h.change > 0).length;

export default function Example() {
  return (
    <div className="ex-stack">
      <StatGrid label="Portfolio today">
        <StatTile label="Value" value={<Figure value={value} kind="rs" dp={0} />} note="Close, 14 Nov 2025" />
        <StatTile label="Today" value={<Figure value={dayChange} kind="rs" dp={0} />} note={<Delta value={(dayChange / value) * 100} />} />
        <StatTile label="Holdings" value={<Figure value={holdings.length} kind="int" />} note={`${gainers} up today`} />
        <StatTile label="Largest" value="NICA" note="Banking, 300 shares" />
      </StatGrid>
      <StatGrid label="Fees" cols={2}>
        <StatTile label="Brokerage" value={<Figure value={1350.5} kind="rs" />} />
        <StatTile label="SEBON fee" value={<Figure value={39.7} kind="rs" />} />
      </StatGrid>
    </div>
  );
}
