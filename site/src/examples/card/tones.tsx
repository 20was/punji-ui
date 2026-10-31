import { Card } from '@punji/ui/card';
import { StepList } from '@punji/ui/step-list';
import { SummaryFigure } from '@punji/ui/summary-figure';

// eyebrow: a small uppercase line over the title. size="lg": a 24px title for a panel that names the one thing it shows.
// tone="inverse": the ONE card on a page that stands out. Never two on a screen.
export default function Example() {
  return (
    <div className="ex-stack">
      <Card eyebrow="Selected sector" title="Hydropower" size="lg" description="22% of invested value">
        <p>Five holdings, two with dividends due.</p>
      </Card>
      <Card tone="inverse" title="Summary" description="If you sold everything today">
        <SummaryFigure label="You would receive" value="Rs 12,34,500" note="after Rs 1,120 fees" />
      </Card>
      <Card title="Cards that do not hold cards" label="Plain section">
        <StepList title="Start here" current={0} steps={[{ title: 'Add a holding' }, { title: 'Set an alert' }]} tone="plain" layout="rows" headingLevel={3} />
      </Card>
    </div>
  );
}
