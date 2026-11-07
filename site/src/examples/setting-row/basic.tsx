import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { SettingList, SettingRow } from '@punji/ui/setting-row';
import { InlineConfirm } from '@punji/ui/inline-confirm';
import { StateGlyph } from '@punji/ui/inline-state';
import { StatusTag } from '@punji/ui/status-tag';

// A toggle takes effect at once and is named by its title; a link row opens a page (a router link through
// LinkProvider); a button row starts something, and a removal asks in an InlineConfirm.
export default function Example() {
  const [summary, setSummary] = useState(true);
  const [asking, setAsking] = useState(false);
  return (
    <Card label="Settings" flush>
      <div style={{ padding: '4px 20px' }}>
        <SettingList>
          <SettingRow icon={<StateGlyph name="clock" />} title="Daily summary" line={summary ? 'On · one summary after the close' : 'Off'} toggle={{ checked: summary, onChange: setSummary }} />
          <SettingRow icon={<StateGlyph name="check" />} title="Two-step sign-in" line="Authenticator app" control={<StatusTag tone="accent">On</StatusTag>} />
          <SettingRow icon={<StateGlyph name="chart" />} title="Statements" line="Monthly, by email" href="/components/switch/" />
          <SettingRow icon={<StateGlyph name="info" />} title="Terms of service" href="https://example.com/terms" newTab />
          {asking ? (
            <InlineConfirm title="Delete your account?" body="Your holdings history is removed." confirm="Delete account" cancel="Keep it" match="DELETE" matchLabel="Type DELETE to confirm" onCancel={() => setAsking(false)} onConfirm={() => setAsking(false)} />
          ) : (
            <SettingRow danger icon={<StateGlyph name="error" />} title="Delete account" line="This cannot be undone" onClick={() => setAsking(true)} />
          )}
        </SettingList>
      </div>
    </Card>
  );
}
