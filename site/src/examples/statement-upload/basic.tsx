import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { StatementUpload } from '@punji/ui/statement-upload';

// StatementUpload only collects and checks files. Sending them is yours: here the button just reports what would go.
export default function Example() {
  const [files, setFiles] = useState<readonly File[]>([]);
  const [sent, setSent] = useState('');
  return (
    <div className="ex-stack ex-narrow">
      <StatementUpload label="Broker statement" value={files} onChange={(next) => { setFiles(next); setSent(''); }} />
      <div>
        <Button disabled={files.length === 0} onClick={() => setSent(`Would upload ${files[0]?.name ?? ''} to your server`)}>Import statement</Button>
      </div>
      {sent && <p className="doc-muted" role="status">{sent}</p>}
    </div>
  );
}
