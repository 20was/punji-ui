import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';

// sm (32) for table rows and toolbars, md (36) by default, lg (44) for the main touch target on a phone.
export default function Example() {
  return (
    <Card title="Siddhartha Bank, SBL" description="LTP Rs 331.20" headingLevel={3}>
      <div style={{ display: 'flex', gap: 'var(--pu-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="sm" variant="secondary">Add to watchlist</Button>
        <Button size="md" variant="secondary">Set alert</Button>
      </div>
      <Button size="lg" block>Buy SBL</Button>
    </Card>
  );
}
