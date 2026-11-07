import { FairValueBar } from '@punji/ui/fair-value-bar';

// Both values are decimal strings: no float is involved. The fair value comes from your app.
export default function Example() {
  return <FairValueBar label="Price against fair value" price="1284.50" fairValue="1670.00" />;
}
