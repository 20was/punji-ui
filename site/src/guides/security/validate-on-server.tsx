import { useState } from 'react';
import { CurrencyInput } from '@punji/ui/currency-input';
import { Button } from '@punji/ui/button';

// The input constrains what a person can type. That is a convenience, not a control: anyone can call your
// API directly. The server must parse and validate the amount again, check limits and permissions, and
// reject what is wrong. Show its error; do not assume the client check passed.
async function submit(minor: bigint): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await fetch('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountMinor: minor.toString(), currency: 'NPR' }), // bigint has no JSON form
  });
  if (response.ok) return { ok: true };
  const body: unknown = await response.json().catch(() => null);
  const message = typeof body === 'object' && body !== null && 'message' in body ? String((body as { message: unknown }).message) : 'The transfer was not accepted.';
  return { ok: false, message };
}

export function TransferForm() {
  const [text, setText] = useState('');
  const [minor, setMinor] = useState<bigint | null>(null);
  const [error, setError] = useState<string | undefined>();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (minor === null) return;
        const result = await submit(minor);
        setError(result.ok ? undefined : result.message);
      }}
    >
      <CurrencyInput
        label="Amount"
        currency="NPR"
        locale="en-IN"
        value={text}
        onValueChange={(change) => {
          setText(change.value);
          setMinor(change.state === 'valid' ? change.minorUnits : null);
        }}
        error={error}
      />
      <Button type="submit" disabled={minor === null}>
        Send
      </Button>
    </form>
  );
}
