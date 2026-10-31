import { Button } from '@punji/ui/button';
import { PageHeader } from '@punji/ui/layout';
import { StatusPill } from '@punji/ui/status-pill';

// back circle, large title, a meta line, and up to three actions. Omit backTo on a root page.
export default function Example() {
  return (
    <div className="ex-stack">
      <PageHeader
        eyebrow="Research"
        title="NABIL"
        stamp={<StatusPill tone="info">After the 19 Oct close</StatusPill>}
        backTo="#"
        backLabel="Back to watchlist"
        meta="Nabil Bank Limited · Commercial banks"
        actions={
          <>
            <Button variant="secondary" size="sm">
              Watch
            </Button>
            <Button size="sm">Add transaction</Button>
          </>
        }
      />
      {/* compact: a tool page's smaller title, so the tool starts in the first screen. */}
      <PageHeader compact title="Screener" meta="12 filters" />
    </div>
  );
}
