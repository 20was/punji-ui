import { Avatar, avatarInitials } from '@punji/ui/avatar';
import { accounts } from '../../sample.ts';

// Initials only: never a photo. Beside a written name the avatar is decorative; alone it needs a label.
export default function Example() {
  const holder = accounts.savings.holder;
  const company = accounts.current.holder;
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Avatar size="sm" name={holder} />
        <Avatar size="md" name={holder} />
        <Avatar size="lg" name={holder} />
        <Avatar name={company} />
        <Avatar email="ram.thapa@example.com" />
        <Avatar />
      </div>
      <div className="ex-row">
        <Avatar tone="accent" name={holder} label={`Account: ${holder}`} />
        <Avatar loading />
        <span>
          {holder} <small className="ex-label">initials {avatarInitials(holder)}</small>
        </span>
      </div>
    </div>
  );
}
