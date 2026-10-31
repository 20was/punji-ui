import { toCsv } from '@punji/ui/export';

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
    <div className="ex-stack">
      <div>
        <p className="doc-muted">Default: text cells that start with a formula character get a leading apostrophe. The number -5 stays numeric.</p>
        <pre className="ex-pre" aria-label="Neutralised CSV">{toCsv(rows, columns, { crlf: false })}</pre>
      </div>
      <div>
        <p className="doc-muted">neutralizeFormulas: false, for trusted machine-generated data only. Never do this with user-typed text.</p>
        <pre className="ex-pre" aria-label="Raw CSV">{toCsv(rows, columns, { crlf: false, neutralizeFormulas: false })}</pre>
      </div>
    </div>
  );
}
