import { Card } from '@punji/ui/card';
import { Sparkline } from '@punji/ui/sparkline';
import { SplitPane } from '@punji/ui/split-pane';
import { nabilCloses } from '../../sample.ts';

export default function Example() {
  return (
    <SplitPane
      label="Resize the chart and the ticket"
      defaultSize={62}
      min={40}
      max={75}
      start={
        <Card title="NABIL" description="Last 30 sessions" headingLevel={3}>
          <Sparkline values={nabilCloses} fluid height={80} label="NABIL closes, last 30 sessions" />
        </Card>
      }
      end={
        <Card title="Order" description="The ticket goes here" headingLevel={3}>
          <p>Buy 10 NABIL at Rs 487.50</p>
        </Card>
      }
    />
  );
}
