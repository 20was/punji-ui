import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { StatusPill } from '@punji/ui/status-pill';

// Tones carry meaning with the words, never colour alone. A pill is not pressable (except as a link).
export default function Example() {
  return (
    <Card title="Recent orders" description="NEPSE, 14 Nov" headingLevel={3}>
      <DataRows label="Orders">
        <DataRow label="Buy 10 NABIL" value={<StatusPill tone="gain">Settled</StatusPill>} />
        <DataRow label="Sell 25 HDL" value={<StatusPill tone="warn">Pending</StatusPill>} />
        <DataRow label="Buy 100 NTC" value={<StatusPill tone="loss">Rejected</StatusPill>} />
        <DataRow label="CHCL bonus 1:5" value={<StatusPill tone="highlight">Bonus</StatusPill>} />
        <DataRow label="Rights offer" value={<StatusPill tone="info">Open</StatusPill>} />
        <DataRow label="Your portfolio" value={<StatusPill tone="accent" size="sm">New</StatusPill>} />
        <DataRow label="Market" value={<StatusPill tone="gain" dot>Open</StatusPill>} />
        <DataRow label="Sector" value={<StatusPill swatch="var(--pu-color-series-4)">Banks</StatusPill>} />
        <DataRow label="Draft" value={<StatusPill>Not sent</StatusPill>} />
      </DataRows>
    </Card>
  );
}
