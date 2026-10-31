import { Card } from '@punji/ui/card';
import { PageHeader, PageLayout } from '@punji/ui/layout';

// PageLayout is the page ground and the page's one <main>. This preview is inert so the docs page keeps a
// single main landmark; in your app, render it once per page, with your navigation in `nav`.
export default function Example() {
  return (
    <div inert>
      <PageLayout nav={<nav aria-label="Example navigation">Navigation goes here</nav>}>
        <PageHeader title="Portfolio" meta="12 holdings" />
        <Card title="Summary">Page content</Card>
      </PageLayout>
    </div>
  );
}
