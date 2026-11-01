import { AccountNumber } from '@punji/ui/account-number';
import { Card } from '@punji/ui/card';
import { accounts, sampleAccountNumber, shortAccountNumber } from '../../sample.ts';
import { RowList, ValueRow } from '@punji/ui/rows';

// Masked until the reader presses the eye button, and masked again by itself. Open the DOM inspector:
// the full number is not in the page while it is masked.
export default function Example() {
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Card title="Linked accounts" description="Where payouts can go" headingLevel={3}>
        <RowList>
          <ValueRow title={accounts.savings.institution} line={accounts.savings.accountType} figure={<AccountNumber value={accounts.savings.accountNumber} />} />
          <ValueRow title={accounts.current.institution} line="Two digits shown" figure={<AccountNumber value={accounts.current.accountNumber} visible={2} />} />
          <ValueRow title="Debit card" line="Never revealed on screen" figure={<AccountNumber value={sampleAccountNumber} revealable={false} />} />
          <ValueRow title="Fixed deposit" line="A short number is never fully shown" figure={<AccountNumber value={shortAccountNumber} />} />
          <ValueRow title={accounts.wallet.institution} line="Not linked yet" figure={<AccountNumber value={null} />} />
        </RowList>
      </Card>
    </div>
  );
}
