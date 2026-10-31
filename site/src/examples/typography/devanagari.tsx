import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <p lang="ne" style={{ margin: 0, fontSize: 'var(--pu-text-lg)' }}>
        रु १२,३४,५६७.८९ · नेपाल स्टक एक्सचेञ्ज
      </p>
      <p lang="en" style={{ margin: 0, fontSize: 'var(--pu-text-lg)' }}>
        NPR 12,34,567.89 · Nepal Stock Exchange
      </p>
      <p style={{ margin: 0, color: 'var(--pu-color-text-muted)' }}>
        Both lines use <code>--pu-font-body</code>; the stack includes Mukta for Devanagari.
      </p>
    </Stack>
  );
}
