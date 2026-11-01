import { HoldToConfirm } from '@punji/ui/hold-to-confirm';
import { TransferReview } from '@punji/ui/transfer-review';

// The name has a Cyrillic "а" (U+0430) where the saved payee has a Latin "a". On screen they look the same.
const LOOKALIKE = `Him${String.fromCodePoint(0x430)}layan Momo`;

export default function Example() {
  return (
    <div className="ex-narrow">
      <TransferReview
        amount={4999900n}
        currency="NPR"
        money={{ locale: 'en-IN', display: 'code' }}
        recipient={{ name: LOOKALIKE, account: '9841 •••• 77', institution: 'eSewa' }}
        knownPayees={['Himalayan Momo']}
        confirm={<HoldToConfirm onConfirm={() => {}}>Send NPR 49,999</HoldToConfirm>}
      />
    </div>
  );
}
