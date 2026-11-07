import { AlertRowCompact } from '@punji/ui/alert-row';
import { AlertSummary, AlertSummaryNote, AlertSummarySection } from '@punji/ui/alert-summary';
import { Stack } from '@punji/ui/stack';

// The card is on the inverse surface; one per view. While the figures answer it keeps their shapes.
export default function Example() {
  return (
    <Stack gap={4}>
      <AlertSummary label="Price alerts" value="4 active" sub="1 paused · 1 triggered">
        <AlertSummarySection title="Closest to firing">
          <AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" closeness={0.87} onOpen={() => {}} />
          <AlertRowCompact title={<><b>NICA</b> below Rs 330</>} aside="5.19% to go" status="waiting" closeness={0.48} onOpen={() => {}} />
        </AlertSummarySection>
        <AlertSummarySection title="Fired lately">
          <AlertSummaryNote>Nothing has fired this week.</AlertSummaryNote>
        </AlertSummarySection>
      </AlertSummary>
      <AlertSummary label="Price alerts" value="" loading />
    </Stack>
  );
}
