import { FxRateDisplay, type FxRate } from '@punji/ui/fx-rate';
import { Stack } from '@punji/ui/stack';

const base = { base: 'USD', quote: 'NPR', asOf: '2026-11-07T04:00:00Z', source: 'Nepal Rastra Bank' } as const;
const buy: FxRate = { ...base, rate: '133.10' };
const sell: FxRate = { ...base, rate: '133.70' };

export default function Example() {
  return (
    <Stack>
      {/* Buy and sell side by side; the timestamp and source print once when they are the same. */}
      <FxRateDisplay buy={buy} sell={sell} timeZone="Asia/Kathmandu" />
      {/* The same quote from the other side, inverted exactly (6 decimals). */}
      <FxRateDisplay rate={{ ...buy, kind: 'mid', rate: '133.40' }} inverse hideSource timeZone="Asia/Kathmandu" />
      {/* Devanagari digits. */}
      <FxRateDisplay rate={{ ...buy, rate: '133.40' }} locale="ne-NP-u-nu-deva" timeZone="Asia/Kathmandu" hideSource />
    </Stack>
  );
}
