import { BankAccountCard } from '@punji/ui/bank-account-card';
import { accounts } from '../../sample.ts';

export default function Example() {
  return (
    <div className="ex-grid">
      <BankAccountCard {...accounts.savings} loading />
      <BankAccountCard {...accounts.savings} error onRetry={() => undefined} />
      <BankAccountCard {...accounts.savings} balance={null} />
    </div>
  );
}
