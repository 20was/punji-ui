import { useState } from 'react';
import { Switch } from '@punji/ui/switch';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// busy: the change is saving. The switch keeps the old state until your save resolves, then flips.
export default function Example() {
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const change = async (next: boolean) => {
    setBusy(true);
    await wait(900); // replace with your request
    setShared(next);
    setBusy(false);
  };
  return (
    <div className="ex-row">
      <Switch checked={shared} onChange={(next) => void change(next)} busy={busy} disabled={busy} label="Share portfolio" />
      <span role="status" className="doc-muted">
        {busy ? 'Saving…' : shared ? 'Shared' : 'Private'}
      </span>
      <Switch checked disabled onChange={() => {}} label="Always on (locked)" />
      <Switch checked={false} disabled onChange={() => {}} label="Not available" />
    </div>
  );
}
