import { DebitCredit } from '@punji/ui/debit-credit';

// The value is a signed net in minor units: positive is a debit, negative a credit.
export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>suffix (default), debit</dt><dd><DebitCredit value={1250000n} /></dd></div>
      <div><dt>suffix, credit</dt><dd><DebitCredit value={-300000n} /></dd></div>
      <div><dt>signed, accounting parentheses</dt><dd><DebitCredit value={-300000n} variant="signed" /></dd></div>
      <div><dt>signed, minus sign</dt><dd><DebitCredit value={-300000n} variant="signed" accounting={false} /></dd></div>
      <div><dt>column, in the Debit column</dt><dd><DebitCredit value={1250000n} variant="column" column="debit" /></dd></div>
      <div><dt>column, in the Credit column</dt><dd><DebitCredit value={-300000n} variant="column" column="credit" /></dd></div>
      <div><dt>zero has no side</dt><dd><DebitCredit value={0n} /></dd></div>
    </dl>
  );
}
