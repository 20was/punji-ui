import { Button } from '@punji/ui/button';
import { Tooltip } from '@punji/ui/info-tip';

// A tooltip names a control that has only an icon. It never holds the only copy of a fact: a phone has no hover.
export default function Example() {
  return (
    <div className="ex-row">
      <Tooltip content="Download CSV">
        <Button variant="secondary" iconOnly label="Download CSV">
          ↓
        </Button>
      </Tooltip>
      {/* describe: also sets aria-describedby while the tip is shown, for a control that already has a visible name. */}
      <Tooltip content="Includes fees and taxes" describe>
        <Button variant="secondary">Net proceeds</Button>
      </Tooltip>
    </div>
  );
}
