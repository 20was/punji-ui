import { Button } from '@punji/ui/button';
import { useClipboard } from '@punji/ui/hooks';
import { Cluster } from '@punji/ui/stack';

export default function Example() {
  const { copy, copied, supported, error } = useClipboard({ timeoutMs: 2000 });
  if (!supported) return <p className="doc-muted">The async Clipboard API is not available here.</p>;
  return (
    <Cluster>
      <Button variant="secondary" onClick={() => void copy('NABIL')}>{copied ? 'Copied' : 'Copy symbol'}</Button>
      <span role="status" className="doc-muted">{copied ? 'NABIL copied to the clipboard' : error ? `Copy failed: ${error}` : ''}</span>
    </Cluster>
  );
}
