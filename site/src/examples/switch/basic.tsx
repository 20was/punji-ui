import { useState } from 'react';
import { Switch } from '@punji/ui/switch';

// Name the switch by the row's visible title (labelledBy) and describe it with the line under it.
export default function Example() {
  const [alerts, setAlerts] = useState(true);
  const [digest, setDigest] = useState(false);
  return (
    <div className="ex-stack">
      <div className="ex-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <b id="sw-alerts">Price alerts</b>
          <div id="sw-alerts-d" className="doc-muted">
            Notify me when a watched stock hits its target
          </div>
        </div>
        <Switch checked={alerts} onChange={setAlerts} labelledBy="sw-alerts" describedBy="sw-alerts-d" />
      </div>
      <div className="ex-row" style={{ justifyContent: 'space-between' }}>
        <b id="sw-digest">Weekly digest</b>
        <Switch checked={digest} onChange={setDigest} labelledBy="sw-digest" />
      </div>
      {/* With no visible title, give the switch its own name. */}
      <div className="ex-row">
        <Switch checked={digest} onChange={setDigest} label="Weekly digest, icon-only row" />
        <span className="doc-muted">{digest ? 'On' : 'Off'}</span>
      </div>
    </div>
  );
}
