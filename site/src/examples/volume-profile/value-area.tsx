import { VolumeProfile, volumeProfile } from '@punji/ui/volume-profile';
import { sessionBars } from '../../sample.ts';

// A tighter value area, no buy/sell split, and the same numbers read straight from the pure `volumeProfile`.
const profile = volumeProfile(sessionBars(), { rows: 18, valueArea: 0.8 });

export default function Example() {
  const poc = profile.rows[profile.pocIndex!]!;
  return (
    <>
      <VolumeProfile profile={profile} split={false} height={320} label="Volume at price, 80% value area" />
      <p>
        Point of Control {poc.low} to {poc.high}. Value area {profile.valueArea!.low} to {profile.valueArea!.high} holds {profile.valueArea!.share}% of {profile.totalVolume.toLocaleString('en-IN')}.
      </p>
    </>
  );
}
