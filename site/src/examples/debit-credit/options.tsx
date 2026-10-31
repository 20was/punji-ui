import { DebitCredit } from '@punji/ui/debit-credit';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <p>Missing: <DebitCredit value={null} /></p>
      <p>Other currency: <DebitCredit value={-1234567n} currency="USD" locale="en-US" display="symbol" /></p>
      <p>Translated words: <DebitCredit value={450000n} labels={{ debit: 'ऋण', credit: 'जम्मा', debitSpoken: 'ऋण', creditSpoken: 'जम्मा' }} /></p>
    </Stack>
  );
}
