import { FxRateDisplay, convertMoney, type FxRate } from '@punji/ui/fx-rate';
import { money, createMoneyFormatter } from '@punji/ui/money';
import { Stack } from '@punji/ui/stack';

const usdNpr: FxRate = { base: 'USD', quote: 'NPR', rate: '133.40', asOf: '2026-11-07T04:00:00Z', source: 'Nepal Rastra Bank' };

// The rate is a decimal string. convertMoney is bigint-only and rounds once, with the mode you choose.
const npr = createMoneyFormatter({ currency: 'NPR' });
const converted = convertMoney(money(1_250_00n, 'USD'), usdNpr, 'half-even');

export default function Example() {
  return (
    <Stack>
      <FxRateDisplay rate={usdNpr} timeZone="Asia/Kathmandu" now={Date.parse('2026-11-07T04:02:00Z')} />
      <p style={{ margin: 0 }}>USD 1,250.00 is {npr.format(converted.minor)}.</p>
    </Stack>
  );
}
