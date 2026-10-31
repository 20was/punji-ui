import { Button } from '@punji/ui/button';
import { StateGlyph } from '@punji/ui/inline-state';

const ACTIONS = [
  { label: 'Send', icon: 'chart' },
  { label: 'Pay bills', icon: 'clock' },
  { label: 'Alerts', icon: 'bell' },
  { label: 'Statements', icon: 'info' },
] as const;

export default function Example() {
  return (
    <div className="ex-row">
      {ACTIONS.map((a) => (
        <Button key={a.label} variant="secondary" stacked icon={<StateGlyph name={a.icon} size={18} />}>
          {a.label}
        </Button>
      ))}
    </div>
  );
}
