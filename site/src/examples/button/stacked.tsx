import { Button } from '@punji/ui/button';
import { StateGlyph } from '@punji/ui/inline-state';

const ACTIONS = [
  { label: 'Send', icon: 'chart' },
  { label: 'Pay bills', icon: 'clock' },
  { label: 'Alerts', icon: 'bell' },
  { label: 'Statements', icon: 'info' },
] as const;

// stacked: the icon over a short label, the quick-action row of a banking app's home screen.
export default function Example() {
  return (
    <div role="group" aria-label="Quick actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(5.5rem, 1fr))', gap: 'var(--pu-space-3)' }}>
      {ACTIONS.map((a) => (
        <Button key={a.label} variant="secondary" stacked icon={<StateGlyph name={a.icon} size={18} />}>
          {a.label}
        </Button>
      ))}
    </div>
  );
}
