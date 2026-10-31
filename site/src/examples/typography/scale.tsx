import { Stack } from '@punji/ui/stack';

const sizes = ['xs', 'sm', 'base', 'lg'] as const;

export default function Example() {
  return (
    <Stack>
      {sizes.map((size) => (
        <p key={size} style={{ margin: 0, fontSize: `var(--pu-text-${size})` }}>
          <code>--pu-text-{size}</code> The quick brown fox, NPR 12,34,567.89
        </p>
      ))}
      <p style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        Tabular digits line up: 1,111.11 / 8,888.88
      </p>
    </Stack>
  );
}
