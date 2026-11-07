import { BrokerBadge } from '@punji/ui/broker-badge';
import { Stack } from '@punji/ui/stack';

// Beside a name the badge is decorative; on its own it takes a label.
export default function Example() {
  return (
    <Stack gap={4}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BrokerBadge code={58} />
        <span>Naasa Securities Company Limited</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {([36, 40, 48, 56] as const).map((size) => <BrokerBadge key={size} code={58} size={size} label={`Broker 58, ${size} pixels`} />)}
        <BrokerBadge code={7} tone="inverse" label="Broker 7" />
        <BrokerBadge code={58} tone="accent" size={56} label="Broker 58, highlighted" />
      </div>
      <BrokerBadge code={58} size={132} caption="Broker" label="Broker 58" />
    </Stack>
  );
}
