import { LinkTable, LinkTableRow, StockLabel } from '@punji/ui/link-table';
import { holdings } from '../../sample.ts';

const rs = (n: number) => `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

// Under 560px of its own width the heads go and each row shows its `compact` layout (lead left, figures right).
export default function Example() {
  return (
    <LinkTable
      label="Holdings"
      chevron
      columns={[
        { key: 'stock', label: 'Stock', track: 'minmax(0, 1.6fr)' },
        { key: 'qty', label: 'Shares', track: '72px', end: true },
        { key: 'ltp', label: 'Price', track: '110px', end: true },
        { key: 'chg', label: 'Day', track: '80px', end: true },
      ]}
    >
      {holdings.slice(0, 5).map((h) => (
        <LinkTableRow
          key={h.symbol}
          href={`#/link-table`}
          cells={[<StockLabel key="s" symbol={h.symbol} line={h.name} />, h.qty, rs(h.ltp), pct(h.change)]}
          compact={{
            lead: <StockLabel symbol={h.symbol} line={h.name} extra={`${h.qty} shares`} />,
            trail: (
              <>
                {rs(h.ltp)} {pct(h.change)}
              </>
            ),
          }}
        />
      ))}
    </LinkTable>
  );
}
