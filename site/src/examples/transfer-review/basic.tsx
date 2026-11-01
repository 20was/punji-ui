import { useState } from 'react';
import { TransferReview } from '@punji/ui/transfer-review';

export default function Example() {
  const [sent, setSent] = useState(false);
  return (
    <div className="ex-narrow">
      <TransferReview
        amount={2500000n}
        currency="NPR"
        money={{ locale: 'en-IN', display: 'code' }}
        fee={1000n}
        recipient={{ name: 'Sita Sharma', account: '0012 •••• 4821', institution: 'Nabil Bank' }}
        knownPayees={['Sita Sharma', 'Himalayan Momo']}
        details={[
          { id: 'from', label: 'From', value: 'Savings •••• 2345' },
          { id: 'remarks', label: 'Remarks', value: 'Rent, Kartik', previous: 'Rent' },
        ]}
        busy={sent}
        onConfirm={() => setSent(true)}
        onEdit={() => setSent(false)}
      />
      {sent && <p role="status">Sent for confirmation. In your app the PIN step comes next.</p>}
    </div>
  );
}
