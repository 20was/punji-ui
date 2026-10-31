import { Avatar, avatarInitials } from '@punji/ui/avatar';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { accounts, beneficiaries } from '../../sample.ts';

// Initials only: never a photo. Beside a written name the avatar is decorative; alone it needs a label.
export default function Example() {
  const holder = accounts.savings.holder;
  return (
    <Card title="Who can see this account" description={`Owner ${holder}, initials ${avatarInitials(holder)}`} headingLevel={3}>
      <DataRows label="People">
        <DataRow label={holder} value={<Avatar tone="accent" name={holder} label={`Owner: ${holder}`} />} />
        <DataRow label={accounts.current.holder} value={<Avatar name={accounts.current.holder} />} />
        <DataRow label="ram.thapa@example.com" value={<Avatar email="ram.thapa@example.com" />} />
        <DataRow label={beneficiaries[0]?.name ?? 'Beneficiary'} value={<Avatar size="sm" name={beneficiaries[0]?.name} />} />
        <DataRow label="Invite pending" value={<Avatar />} />
        <DataRow label="Loading the team" value={<Avatar loading />} />
      </DataRows>
    </Card>
  );
}
