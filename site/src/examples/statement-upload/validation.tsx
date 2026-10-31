import { useState } from 'react';
import { StatementUpload, type StatementRejection } from '@punji/ui/statement-upload';

export default function Example() {
  const [refused, setRefused] = useState<StatementRejection[]>([]);
  return (
    <div className="ex-stack ex-narrow">
      <StatementUpload
        label="NEPSE trade book"
        accept={['.csv']}
        maxSize={100 * 1024}
        onReject={setRefused}
        labels={{
          type: (name) => `${name} is not a CSV. Export the trade book as CSV from your broker.`,
          size: (name, limit) => `${name} is over ${limit}. Export a shorter period.`,
        }}
      />
      <p className="doc-muted">Refused on the last attempt: <code>{refused.length === 0 ? 'none' : refused.map((r) => r.reason).join(', ')}</code></p>
    </div>
  );
}
