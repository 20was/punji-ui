import { useState } from 'react';
import { Card } from '@punji/ui/card';
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
    <Card title="Privacy" description="Who can see your holdings" headingLevel={3}>
      <Switch checked={shared} onChange={(next) => void change(next)} busy={busy} disabled={busy} label="Share portfolio with family" />
      <p role="status">{busy ? 'Saving…' : shared ? 'Family can see your holdings' : 'Only you can see your holdings'}</p>
      <Switch checked disabled onChange={() => {}} label="Two-step login (required by your bank)" />
      <Switch checked={false} disabled onChange={() => {}} label="Price alerts by SMS (not on your plan)" />
    </Card>
  );
}
