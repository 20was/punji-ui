import { useState } from 'react';
import { divideRounded, type RoundingMode } from '@punji/ui/calculations';
import { Card } from '@punji/ui/card';
import { Field, SelectField } from '@punji/ui/fields';
import { addMoney, formatMoney, money, parseMoney } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Stack } from '@punji/ui/stack';

const usd = { currency: 'USD', locale: 'en-US', display: 'none' } as const;
const MODES: RoundingMode[] = ['half-even', 'half-up', 'floor', 'ceil', 'trunc'];

export default function Example() {
  const [a, setA] = useState('0.1');
  const [b, setB] = useState('0.2');
  const [x, setX] = useState('1.005');
  const [mode, setMode] = useState<RoundingMode>('half-even');

  const pa = parseMoney(a, usd);
  const pb = parseMoney(b, usd);
  const sum = pa.state === 'valid' && pb.state === 'valid' ? addMoney(money(pa.minor, 'USD'), money(pb.minor, 'USD')) : null;
  const floatSum = a.trim() !== '' && b.trim() !== '' ? Number(a) + Number(b) : NaN;

  // Up to three decimals, read as thousandths: no Number involved.
  const shape = /^(-?)(\d{1,15})(?:\.(\d{1,3}))?$/.exec(x.trim());
  const thousandths = shape ? BigInt(`${shape[1]}${shape[2]}${(shape[3] ?? '').padEnd(3, '0')}`) : null;

  return (
    <Stack>
      <Card title="Add two amounts" headingLevel={3}>
        <Stack>
          <Field label="First amount" value={a} onChange={setA} inputMode="decimal" hint="Up to 2 decimals" />
          <Field label="Second amount" value={b} onChange={setB} inputMode="decimal" hint="Up to 2 decimals" />
          <DataRows flush label="Sum">
            <DataRow label="Float" value={Number.isFinite(floatSum) ? String(floatSum) : '-'} testId="try-float-sum" />
            <DataRow label="Punji" value={sum ? formatMoney(sum.minor, usd) : 'Enter two amounts with at most 2 decimals'} testId="try-punji-sum" />
          </DataRows>
        </Stack>
      </Card>
      <Card title="Round to cents" headingLevel={3}>
        <Stack>
          <Field label="Amount" value={x} onChange={setX} inputMode="decimal" hint="Up to 3 decimals, for example 1.005 or -2.505" />
          <SelectField label="Rounding mode" value={mode} onChange={(v) => setMode(v as RoundingMode)} options={MODES.map((m) => ({ value: m, label: m }))} />
          <DataRows flush label="Rounded to 2 places">
            <DataRow label="Float toFixed(2)" value={shape ? Number(x).toFixed(2) : '-'} testId="try-float-round" />
            <DataRow label={`Punji ${mode}`} value={thousandths !== null ? formatMoney(divideRounded(thousandths, 10n, mode), usd) : 'Enter a number with at most 3 decimals'} testId="try-punji-round" />
          </DataRows>
        </Stack>
      </Card>
    </Stack>
  );
}
