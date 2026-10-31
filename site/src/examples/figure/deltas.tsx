import { Card } from '@punji/ui/card';
import { Delta } from '@punji/ui/figures';
import { DataRow, DataRows } from '@punji/ui/rows';
import { holdings } from '../../sample.ts';

const change = (symbol: string) => holdings.find((h) => h.symbol === symbol)!.change;

// A change is a sign, an arrow, a colour and a spoken word ("up", "down", "unchanged"), never colour alone.
// A move that prints as 0.00 is no move: grey, no arrow.
export default function Example() {
  return (
    <Card title="Today's moves" description="14 Nov close" headingLevel={3}>
      <DataRows label="Daily change">
        <DataRow label="HDL" value={<Delta value={change('HDL')} />} />
        <DataRow label="NICA" value={<Delta value={change('NICA')} />} />
        <DataRow label="SBL, unchanged" value={<Delta value={change('SBL')} />} />
        <DataRow label="NTC, in rupees" value={<Delta value={-3.95} kind="rs" arrow={false} />} />
        <DataRow label="UPPER, in Nepali" value={<Delta value={change('UPPER')} size="sm" words={{ up: 'बढेको', down: 'घटेको', flat: 'उस्तै' }} />} />
        <DataRow label="BFC, not traded" value={<Delta value={undefined} />} />
      </DataRows>
    </Card>
  );
}
