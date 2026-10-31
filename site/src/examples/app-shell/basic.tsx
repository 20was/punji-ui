import { AppShell } from '@punji/ui/financial';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';

// AppShell: skip link, banner, navigation, main and footer landmarks. It is router independent: you pass
// the navigation. This preview is inert so the docs page keeps one set of landmarks; render it once per app.
export default function Example() {
  return (
    <div inert>
      <AppShell
        brand={<strong>Ledger</strong>}
        actions={<Button size="sm">New entry</Button>}
        navigationLabel="Main"
        navigation={
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: 'var(--pu-space-3)' }}>
            <li>Journal</li>
            <li>Reports</li>
          </ul>
        }
        footer="Figures in NPR"
      >
        <Card title="Trial balance">Content</Card>
      </AppShell>
    </div>
  );
}
