import { CorporateActionTimeline } from '@punji/ui/corporate-action-timeline';
import { corporateEvents, issuesToday } from '../../sample.ts';

// Dates are Gregorian YYYY-MM-DD; the Bikram Sambat date is printed first.
export default function Example() {
  return <CorporateActionTimeline events={corporateEvents} today={issuesToday} label="Bonus and AGM dates" />;
}
