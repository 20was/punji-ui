import { useMemo } from 'react';
import { Button } from '@punji/ui/button';
import { toCsv, CSV_MIME } from '@punji/ui/export';
import { downloadText } from '@punji/ui/download';
import { holdings } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';
import { CodeBlock } from '@punji/ui/code-block';

export default function Example() {
  const csv = useMemo(
    () =>
      toCsv(
        holdings.slice(0, 4),
        [
          { header: 'Symbol', accessor: 'symbol' },
          { header: 'Company', accessor: 'name' },
          { header: 'Units', accessor: 'qty' }, // number: written as-is
          { header: 'Last price (NPR)', accessor: 'ltp' },
        ],
        { bom: true },
      ),
    [],
  );
  return (
    <Stack>
      <div>
        <Button variant="secondary" onClick={() => downloadText('holdings.csv', csv, CSV_MIME)}>
          Download holdings.csv
        </Button>
      </div>
      <CodeBlock aria-label="CSV text">{csv.replace(/^\uFEFF/, '')}</CodeBlock>
    </Stack>
  );
}
