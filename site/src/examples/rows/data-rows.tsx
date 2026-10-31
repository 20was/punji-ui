import { MeterBar } from '@punji/ui/meter';
import { Figure } from '@punji/ui/figures';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';

// Facts: a label on the left, the value on the right, in a definition list. total marks the closing row;
// bar and note explain what a value means on a scale.
export default function Example() {
  return (
    <div className="ex-stack">
      <Card title="Cost basis">
        <DataRows label="Cost basis">
          <DataRow label="Invested" value={<Figure value={84250} kind="rs" />} />
          <DataRow label="Fees" value={<Figure value={420} kind="rs" />} />
          <DataRow label="Total cost" total value={<Figure value={84670} kind="rs" />} />
        </DataRows>
      </Card>
      <Card title="52 week range" flush>
        <DataRows flush label="52 week range">
          <DataRow label="Price" value={<Figure value={547} kind="rs" />} bar={<MeterBar parts={[{ value: 71, tone: 'chart' }]} max={100} />} note="547.00 sits 71% of the way up" />
        </DataRows>
      </Card>
    </div>
  );
}
