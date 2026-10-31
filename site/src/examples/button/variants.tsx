import { Button } from '@punji/ui/button';

export default function Example() {
  return (
    <div className="ex-row">
      <Button variant="primary">Place order</Button>
      <Button variant="secondary">Save draft</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Delete account</Button>
      <Button variant="secondary" href="https://example.com">External link</Button>
    </div>
  );
}
