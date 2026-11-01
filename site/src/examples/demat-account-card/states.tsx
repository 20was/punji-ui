import { DematAccountCard } from '@punji/ui/demat-account-card';
import { dematAccounts } from '../../sample.ts';

export default function Example() {
  return (
    <div className="ex-grid">
      <DematAccountCard {...dematAccounts.active} loading />
      <DematAccountCard {...dematAccounts.active} error onRetry={() => undefined} />
    </div>
  );
}
