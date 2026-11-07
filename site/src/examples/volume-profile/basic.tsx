import { VolumeProfile } from '@punji/ui/volume-profile';
import { sessionBars } from '../../sample.ts';

// Prices are decimal strings and volumes are exact integers (bigint), so the rows add back up to the volume you gave.
export default function Example() {
  return <VolumeProfile bars={sessionBars()} rows={24} height={380} label="NABIL volume at price, last session" />;
}
