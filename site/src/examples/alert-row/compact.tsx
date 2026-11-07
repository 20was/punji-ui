import { AlertRowCompact } from '@punji/ui/alert-row';
import { alertDistance } from '@punji/ui/alert-distance';
import { alertTarget } from '@punji/ui/alert-target';
import { Card } from '@punji/ui/card';

const d = alertDistance('above', 50000n, 49380n)!;

// One line and a bar: a link with `href`, a button with `onOpen`, plain text with neither.
export default function Example() {
  return (
    <Card title="Closest to firing" headingLevel={3}>
      <AlertRowCompact title={<><b>HRL</b> above {alertTarget(50000n)}</>} aside={`${d.pct.toFixed(2)}% to go`} status="waiting" closeness={d.closeness} onOpen={() => {}} />
      <AlertRowCompact title={<><b>NICA</b> below {alertTarget(33000n)}</>} aside="Past the target" status="crossed" closeness={1} onOpen={() => {}} />
      <AlertRowCompact title={<><b>NABIL</b> above {alertTarget(52000n)}</>} aside="Reached" status="fired" sub="Now 520.00 · Fri 16 Oct, 13:42" />
      <AlertRowCompact title={<><b>SBI</b> below {alertTarget(28000n)}</>} aside="Waiting for the first price after a long pause in trading" status="paused" stack />
    </Card>
  );
}
