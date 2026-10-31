import { InfoTip } from '@punji/ui/info-tip';
import { Stack } from '@punji/ui/stack';

// InfoTip explains a label on a visible (i) button, never a native title: hover or focus shows it at once,
// a click or tap keeps it open until Esc, a second tap, a tap elsewhere or a scroll.
export default function Example() {
  return (
    <Stack>
      <p style={{ margin: 0 }}>
        Weighted average cost <InfoTip label="About weighted average cost">The average price you paid, weighted by the number of shares in each purchase. Sold shares do not change it.</InfoTip>
      </p>
      <p style={{ margin: 0 }}>
        Circuit limit <InfoTip label="What is this? About the circuit limit" trigger="What is this?">The most a price may rise or fall in one session. The exchange sets it.</InfoTip>
      </p>
    </Stack>
  );
}
