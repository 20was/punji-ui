import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { boidMessage, checkBoid, checkKitta, formatBoid, kittaMessage, nearestValidKitta, type KittaRules } from '@punji/ui/share-issues';

const rules: KittaRules = { min: 10n, max: 1000n, multiple: 10n };
const say = (text: string) => {
  const c = checkKitta(text, rules);
  return c.ok ? `${c.kitta.toString()} units, fine` : kittaMessage(c.problem, rules);
};
const boid = (text: string) => {
  const c = checkBoid(text);
  return c.ok ? `DP ${c.parts.dpId}, client ${c.parts.clientId}` : boidMessage(c.problem, c.digits);
};

export default function Example() {
  return (
    <Card title="Checks before sending" description="10 to 1,000 kitta in multiples of 10" headingLevel={3}>
      <DataRows label="Kitta and BOID checks">
        <DataRow label="Kitta 15" value={say('15')} />
        <DataRow label="Kitta १००" value={say('१००')} />
        <DataRow label="Kitta 5" value={say('5')} />
        <DataRow label="Nearest valid to 17" value={String(nearestValidKitta(17n, rules))} />
        <DataRow label="BOID pasted with spaces" value={boid('1301 3700 0001 2345')} />
        <DataRow label="BOID with 15 digits" value={boid('130137000001234')} />
        <DataRow label="Masked for a receipt" value={formatBoid('1301370000012345', { mask: true })} />
      </DataRows>
    </Card>
  );
}
