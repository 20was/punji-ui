import { useMemo } from 'react';
import { transactionsToCsv } from '@punji/ui/banking';
import { Button } from '@punji/ui/button';
import { downloadText } from '@punji/ui/download';
import { CSV_MIME } from '@punji/ui/export';
import { transactions } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';
import { CodeBlock } from '@punji/ui/code-block';

// The same entries the list shows. The hostile counterparty (=HYPERLINK) and reference (@REV) come out neutralised.
export default function Example() {
  const csv = useMemo(() => transactionsToCsv(transactions.slice(0, 5), { currency: 'NPR', balance: true, crlf: false }), []);
  return (
    <Stack>
      <div>
        <Button variant="secondary" onClick={() => downloadText('transactions.csv', csv, CSV_MIME)}>Download transactions.csv</Button>
      </div>
      <CodeBlock aria-label="CSV text">{csv}</CodeBlock>
    </Stack>
  );
}
