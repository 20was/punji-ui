import { EmptyState, Note } from '@punji/ui/states';
import { StatusDisc } from '@punji/ui/check-row';
import { StateGlyph } from '@punji/ui/inline-state';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';

export default function Example() {
  return (
    <div className="ex-stack">
      <EmptyState title="No holdings yet" body="Add your first holding to see your portfolio." action={<Button size="sm">Add a holding</Button>} />
      <EmptyState
        center
        icon={
          <StatusDisc tone="info" size="lg">
            <StateGlyph name="chart" size={22} />
          </StatusDisc>
        }
        title="Nothing to chart"
        body="Prices appear after the first session."
      />
      <EmptyState role="alert" title="This page could not be loaded" body="Check your connection and try again." action={<Button size="sm">Try again</Button>} />
      <Card title="Inside a card" headingLevel={3}>
        <EmptyState bare title="No transactions" body="A card never holds a card, so the state drops its own box." />
      </Card>
      <Note>Prices are delayed by 15 minutes.</Note>
      <Note tone="warn">Dividend data for this year is not final.</Note>
      <Note tone="error">The last sync failed; figures may be stale.</Note>
      <Note quiet>Source: exchange end-of-day file.</Note>
      <Note plain>Figures are synthetic.</Note>
    </div>
  );
}
