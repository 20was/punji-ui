import { Button } from '@punji/ui/button';
import { DematAccountCard } from '@punji/ui/demat-account-card';
import { dematAccounts, issuesToday } from '../../sample.ts';

export default function Example() {
  return (
    <div className="ex-grid">
      <DematAccountCard {...dematAccounts.active} today={issuesToday} actions={<Button variant="secondary" size="sm">Renew online access</Button>} />
      <DematAccountCard {...dematAccounts.dormant} today={issuesToday} maskBoid />
    </div>
  );
}
