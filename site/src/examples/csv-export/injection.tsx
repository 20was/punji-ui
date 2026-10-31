import { toCsv } from '@punji/ui/export';
import { Stack } from '@punji/ui/stack';
import { CodeBlock } from '@punji/ui/code-block';

const rows = [
  { memo: '=HYPERLINK("https://example.invalid","click")', amount: 12.5 },
  { memo: "+cmd|' /C calc'!A0", amount: -5 },
  { memo: '@SUM(1+1)', amount: 0 },
  { memo: 'Salary, March', amount: 1000 },
];
const columns = [
  { header: 'Memo', accessor: 'memo' as const },
  { header: 'Amount', accessor: 'amount' as const },
];

export default function Example() {
  return (
    <Stack>
      <div>
        <p className="doc-muted">Default: text cells that start with a formula character get a leading apostrophe. The number -5 stays numeric.</p>
        <CodeBlock aria-label="Neutralised CSV">{toCsv(rows, columns, { crlf: false })}</CodeBlock>
      </div>
      <div>
        <p className="doc-muted">neutralizeFormulas: false, for trusted machine-generated data only. Never do this with user-typed text.</p>
        <CodeBlock aria-label="Raw CSV">{toCsv(rows, columns, { crlf: false, neutralizeFormulas: false })}</CodeBlock>
      </div>
    </Stack>
  );
}
