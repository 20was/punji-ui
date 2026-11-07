import { Cell, DataTable } from '@punji/ui/table';
import { LockedCell, LockedHead } from '@punji/ui/locked-cell';

// A column the account does not include: the head keeps its name with a lock (sortable: false), each cell is a bar
// read as "Not included on this account". The rows hold no value for it: the server leaves the figures out.
export default function Example() {
  return (
    <div style={{ inlineSize: 'min(36rem, 100%)' }}>
      <DataTable
        caption="Broker activity"
        columns={[
          { key: 'broker', label: 'Broker' },
          { key: 'buy', label: 'Bought', num: true },
          { key: 'net', label: <LockedHead>Net</LockedHead>, num: true, sortable: false },
        ]}
      >
        {[
          ['58 Naasa', '1,24,000'],
          ['34 Imperial', '98,500'],
          ['45 Vision', '71,200'],
        ].map(([broker, buy]) => (
          <tr key={broker}>
            <Cell header>{broker}</Cell>
            <Cell num label="Bought">
              {buy}
            </Cell>
            <LockedCell column="Net" />
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
