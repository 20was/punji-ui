import { InstrumentHeader } from '@punji/ui/instrument-header';
import { Stack } from '@punji/ui/stack';

// Prices are bigint minor units (paisa). The change is worked out exactly from the previous close.
export default function Example() {
  return (
    <Stack gap={4}>
      <InstrumentHeader symbol="NABIL" name="Nabil Bank Limited" group="Commercial Banks" currency="NPR" price={51230n} previousClose={50800n} />
      <InstrumentHeader symbol="HRL" name="Himalayan Reinsurance Limited" group="Non-Life Insurance" currency="NPR" price={49380n} previousClose={50120n} />
      <InstrumentHeader symbol="NICA" name="NIC Asia Bank Limited" currency="NPR" price={34810n} previousClose={34810n} note="Last close · 16 Oct" />
      <InstrumentHeader symbol="SBI" currency="NPR" price={null} loading />
    </Stack>
  );
}
