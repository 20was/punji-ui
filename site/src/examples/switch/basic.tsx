import { useState } from 'react';
import { Switch } from '@punji/ui/switch';
import { Cluster, Stack } from '@punji/ui/stack';

// Name the switch by the row's visible title (labelledBy) and describe it with the line under it.
export default function Example() {
  const [alerts, setAlerts] = useState(true);
  const [digest, setDigest] = useState(false);
  return (
    <Stack>
      <Cluster justify="between">
        <div>
          <b id="sw-alerts">Price alerts</b>
          <div id="sw-alerts-d" className="doc-muted">
            Notify me when a watched stock hits its target
          </div>
        </div>
        <Switch checked={alerts} onChange={setAlerts} labelledBy="sw-alerts" describedBy="sw-alerts-d" />
      </Cluster>
      <Cluster justify="between">
        <b id="sw-digest">Weekly digest</b>
        <Switch checked={digest} onChange={setDigest} labelledBy="sw-digest" />
      </Cluster>
      {/* With no visible title, give the switch its own name. */}
      <Cluster>
        <Switch checked={digest} onChange={setDigest} label="Weekly digest, icon-only row" />
        <span className="doc-muted">{digest ? 'On' : 'Off'}</span>
      </Cluster>
    </Stack>
  );
}
