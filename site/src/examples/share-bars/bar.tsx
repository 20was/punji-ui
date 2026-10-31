import { ShareBar, SHARE_TONES, type ShareItem } from '@punji/ui/meter';
import { sectorShares } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

const items: ShareItem[] = sectorShares.map((s, i) => ({ key: s.key, label: s.label, pct: s.pct, tone: SHARE_TONES[i] ?? 'rest' }));

// `label` says the shares in words (the bar itself is a picture). Each legend row has its name and value.
export default function Example() {
  return (
    <Stack>
      <ShareBar
        items={items}
        label="Banking 46 percent, Hydropower 22, Manufacturing 14, Insurance 10, Telecom 8"
        foot="Percentages of invested value."
      />
      <ShareBar items={items} label="The same shares, compact list legend" legend="list" />
    </Stack>
  );
}
