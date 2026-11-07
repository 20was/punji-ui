import { Card } from '@punji/ui/card';
import { MarketStatus } from '@punji/ui/market-status';
import { DataRow, DataRows } from '@punji/ui/rows';

// `offline` is the device's connection: the figures beside it are the last it had. The index sits outside the
// live status region, so a price tick is not announced; its change carries an arrow, a sign and a word.
export default function Example() {
  return (
    <Card title="NEPSE" description="Session and index" headingLevel={3}>
      <DataRows label="Session and index">
        <DataRow label="Open" value={<MarketStatus state="open" market="NEPSE" index={{ name: 'NEPSE', value: '2,641.18', change: '+0.42%', direction: 'up' }} />} />
        <DataRow label="Closed" value={<MarketStatus state="closed" market="NEPSE" detail="16 Oct close" index={{ name: 'NEPSE', value: '2,629.04', change: '−0.31%', direction: 'down' }} />} />
        <DataRow label="Offline" value={<MarketStatus state="offline" market="NEPSE" detail="as of 13:42" index={{ name: 'NEPSE', value: '2,641.18', change: '+0.42%', direction: 'up' }} />} />
        <DataRow label="No change known" value={<MarketStatus state="pre-open" market="NEPSE" index={{ name: 'NEPSE', value: '2,641.18' }} />} />
      </DataRows>
    </Card>
  );
}
