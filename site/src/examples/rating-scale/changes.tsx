import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { RatingChangeHead, RatingChangeList, RatingChangeRow } from '@punji/ui/rating-change-row';

const up = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
const price = (minor: bigint) => <MoneyDisplay value={minor} currency="NPR" display="none" />;

// The list's own width decides the layout: narrow the card and the scale and chevron leave.
export default function Example() {
  return (
    <Card title="Rating changes" description="This week" headingLevel={3}>
      <RatingChangeHead item="Stock" move="Rating" scale="Scale" figure="Price" />
      <RatingChangeList title="Moved up" icon={up} tone="info" count={2}>
        <RatingChangeRow icon={up} title="NABIL" line="Nabil Bank Limited" from={{ step: 2, label: 'Hold' }} to={{ step: 3, label: 'Overweight' }} figure={price(51230n)} figureSub="Getting stronger" moveLabel="Hold to Overweight" onClick={() => {}} />
        <RatingChangeRow icon={up} title="NICA" line="NIC Asia Bank Limited" from={{ step: null, label: 'Not rated' }} to={{ step: 4, label: 'Buy' }} figure={price(34810n)} moveLabel="Not rated to Buy" />
      </RatingChangeList>
      <RatingChangeList title="Held" variant="held" count={2}>
        <RatingChangeRow variant="held" title="SBI" line="Nepal SBI Bank" to={{ step: 2, label: 'Hold' }} />
        <RatingChangeRow variant="held" title="HRL" line="Himalayan Reinsurance" to={{ step: 1, label: 'Underweight' }} figureSub="Low confidence" />
      </RatingChangeList>
    </Card>
  );
}
