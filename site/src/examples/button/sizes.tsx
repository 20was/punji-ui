import { Button } from '@punji/ui/button';

export default function Example() {
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Button size="sm">Small 32</Button>
        <Button size="md">Medium 36</Button>
        <Button size="lg">Large 44</Button>
      </div>
      <Button size="lg" block>Block, full width</Button>
    </div>
  );
}
