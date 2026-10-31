import { StatementUpload } from '@punji/ui/statement-upload';

// Uncontrolled: the component keeps the list and tells you about every change.
function monthlyStatement(name: string): File {
  return new File([new Uint8Array(24_000)], name, { type: 'text/csv', lastModified: 1_730_000_000_000 });
}

export default function Example() {
  return (
    <div className="ex-narrow">
      <StatementUpload
        label="Monthly bank statements"
        multiple
        maxFiles={3}
        accept={['.csv', '.pdf']}
        defaultValue={[monthlyStatement('nabil-2082-shrawan.csv'), monthlyStatement('nabil-2082-bhadra.csv')]}
        hint="Up to 3 files, CSV or PDF"
      />
    </div>
  );
}
