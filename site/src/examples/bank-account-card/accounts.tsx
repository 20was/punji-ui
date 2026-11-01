import { BankAccountCard } from '@punji/ui/bank-account-card';
import { Button } from '@punji/ui/button';
import { accounts } from '../../sample.ts';

// Bank and wallet names are plain strings you pass; the component knows no institution.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <BankAccountCard {...accounts.savings} actions={<Button variant="secondary" size="sm">Statement</Button>} />
      <BankAccountCard {...accounts.current} balanceToggle defaultBalanceHidden={false} />
      <BankAccountCard {...accounts.wallet} balanceToggle />
      <BankAccountCard {...accounts.closed} money={{ currency: 'USD', locale: 'en-US' }} />
    </div>
  );
}
