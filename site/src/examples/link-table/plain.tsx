import { LinkTable, LinkTableRow, StockLabel } from '@punji/ui/link-table';
import { StatusPill } from '@punji/ui/status-pill';

// Rows without `href` are plain; `heads={false}` hides the column heads; compactAt={360} keeps the table layout down to 360px.
export default function Example() {
  return (
    <LinkTable
      label="Sectors"
      heads={false}
      compactAt={360}
      columns={[
        { key: 'sector', label: 'Sector', track: 'minmax(0, 1fr)' },
        { key: 'share', label: 'Share', track: '64px', end: true },
      ]}
    >
      <LinkTableRow
        cells={[<StockLabel key="a" symbol="Banking" tag={<StatusPill tone="gain">Largest</StatusPill>} line="5 stocks" />, '46%']}
      />
      <LinkTableRow cells={[<StockLabel key="b" symbol="Hydropower" line="2 stocks" />, '22%']} />
      <LinkTableRow cells={[<StockLabel key="c" symbol="Telecom" line="1 stock" />, '8%']} />
    </LinkTable>
  );
}
