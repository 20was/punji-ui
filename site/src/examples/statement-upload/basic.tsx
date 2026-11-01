import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { StatementUpload } from '@punji/ui/statement-upload';
import { Stack } from '@punji/ui/stack';

// StatementUpload only collects and checks files. Sending them is yours: here the button just reports what would go.
export default function Example() {
  const [files, setFiles] = useState<readonly File[]>([]);
  const [sent, setSent] = useState('');
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <StatementUpload label="Broker statement" value={files} onChange={(next) => { setFiles(next); setSent(''); }} />
      <div>
        <Button disabled={files.length === 0} onClick={() => setSent(`Would upload ${files[0]?.name ?? ''} to your server`)}>Import statement</Button>
      </div>
      {sent && <p className="doc-muted" role="status">{sent}</p>}
    </Stack>
  );
}
