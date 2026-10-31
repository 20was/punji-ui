import { Button } from '@punji/ui/button';

export default function Example() {
  return (
    <div className="ex-row">
      <Button size="sm">sm 32</Button>
      <Button size="md">md 36</Button>
      <Button size="lg">lg 44</Button>
      <span style={{ height: 'var(--pu-control-md)', padding: '0 var(--pu-space-3)', display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--pu-radius-control)', border: '1px solid var(--pu-color-border-control)' }}>
        your element at --pu-control-md
      </span>
    </div>
  );
}
