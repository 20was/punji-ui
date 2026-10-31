import { AccountNumber } from '@punji/ui/account-number';
import { Card } from '@punji/ui/card';
import { accounts, sampleAccountNumber, shortAccountNumber } from '../../sample.ts';

// Masked until the reader presses the eye button, and masked again by itself. Open the DOM inspector:
// the full number is not in the page while it is masked.
export default function Example() {
  return (
    <div className="ex-narrow">
      <Card title="Linked accounts" description="Where payouts can go" headingLevel={3}>
        <ul className="ex-rows">
          <li>
            <span>
              <b>{accounts.savings.institution}</b>
              <small>{accounts.savings.accountType}</small>
            </span>
            <AccountNumber value={accounts.savings.accountNumber} />
          </li>
          <li>
            <span>
              <b>{accounts.current.institution}</b>
              <small>Two digits shown</small>
            </span>
            <AccountNumber value={accounts.current.accountNumber} visible={2} />
          </li>
          <li>
            <span>
              <b>Debit card</b>
              <small>Never revealed on screen</small>
            </span>
            <AccountNumber value={sampleAccountNumber} revealable={false} />
          </li>
          <li>
            <span>
              <b>Fixed deposit</b>
              <small>A short number is never fully shown</small>
            </span>
            <AccountNumber value={shortAccountNumber} />
          </li>
          <li>
            <span>
              <b>{accounts.wallet.institution}</b>
              <small>Not linked yet</small>
            </span>
            <AccountNumber value={null} />
          </li>
        </ul>
      </Card>
    </div>
  );
}
