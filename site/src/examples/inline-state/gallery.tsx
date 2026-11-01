import { InlineState } from '@punji/ui/inline-state';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';

// Stack layout: the actions sit under the words. The icon is decorative; the title and body say the state.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <Card title="Locked" headingLevel={3}>
        <InlineState bare icon="lock" title="Not included on this account" body="Ask your administrator to enable fundamentals." />
      </Card>
      <Card title="Failed" headingLevel={3}>
        <InlineState
          bare
          icon="error"
          tone="error"
          role="alert"
          title="Could not load your alerts"
          body="Your other settings are unaffected."
          actions={<Button size="sm" variant="secondary">Try again</Button>}
        />
      </Card>
      <Card title="Empty" headingLevel={3}>
        <InlineState bare icon="bell" title="No alerts yet" body="Set one to hear when a price crosses your level." actions={<Button size="sm">Add an alert</Button>} />
      </Card>
    </div>
  );
}
