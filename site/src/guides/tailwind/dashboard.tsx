import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Button } from '@punji/ui/button';

// Tailwind owns layout (grid, gaps, placement); Punji owns the look of its components.
// Utilities beat Punji's component rules because of the layer order in app.css, so className on a Punji
// component is for placement, not for restyling it.
export function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2" title="Portfolio value">
        <p className="text-3xl font-semibold">
          <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />
        </p>
      </Card>
      <Card title="Actions">
        <Button className="w-full">Add transaction</Button>
      </Card>
    </div>
  );
}
