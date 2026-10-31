import type { ReactNode } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';

// The section carries a data attribute; app.css (see the CSS block) re-points the accent tokens inside it.
// Everything built on those tokens (links, the primary button, charts) follows, with no change to the components.
export function ResearchSection({ children }: { children: ReactNode }) {
  return (
    <section data-section="research">
      <Card title="Research" description="Accent overridden for this section only" footer={<Button size="sm">Open report</Button>}>
        {children}
      </Card>
    </section>
  );
}
