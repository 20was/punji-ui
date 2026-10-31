import { AccountNumber } from '@punji/ui/account-number';
import { sampleAccountNumber, shortAccountNumber } from '../../sample.ts';

// Masked until the reader presses the eye button. Open the page's DOM inspector: the full number is not there while masked.
export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>Default: last four, reveal toggle</dt><dd><AccountNumber value={sampleAccountNumber} /></dd></div>
      <div><dt>Two digits visible</dt><dd><AccountNumber value={sampleAccountNumber} visible={2} /></dd></div>
      <div><dt>Never revealable</dt><dd><AccountNumber value={sampleAccountNumber} revealable={false} /></dd></div>
      <div><dt>Short number: never fully shown</dt><dd><AccountNumber value={shortAccountNumber} /></dd></div>
      <div><dt>Missing</dt><dd><AccountNumber value={null} /></dd></div>
    </dl>
  );
}
