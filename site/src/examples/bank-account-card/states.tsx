import { BankAccountCard } from '@punji/ui/bank-account-card';
import { accounts } from '../../sample.ts';

export default function Example() {
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <BankAccountCard {...accounts.savings} loading />
      <BankAccountCard {...accounts.savings} error onRetry={() => undefined} />
      <BankAccountCard {...accounts.savings} balance={null} />
    </div>
  );
}
