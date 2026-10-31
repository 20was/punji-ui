import { Cluster, Stack } from '@punji/ui/stack';

const steps = [1, 2, 3, 4, 16] as const;

export default function Example() {
  return (
    <Stack>
      {steps.map((step) => (
        <Cluster key={step}>
          <code style={{ width: '9rem' }}>--pu-space-{step}</code>
          <span style={{ display: 'block', height: '1rem', width: `var(--pu-space-${step})`, background: 'var(--pu-color-accent)', borderRadius: 2 }} />
        </Cluster>
      ))}
    </Stack>
  );
}
