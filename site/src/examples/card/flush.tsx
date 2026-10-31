import { Card } from '@punji/ui/card';
import { StockTable } from '@punji/ui/stock-table';
import { Button } from '@punji/ui/button';
import { StateGlyph } from '@punji/ui/inline-state';
import { StatusDisc } from '@punji/ui/check-row';
import { quotes } from '../../sample.ts';

// flush: no inner padding, a table runs to the edges. icon: a StatusDisc before the title.
// stretch + footer: in a grid the cards share a height and the footer sits at the bottom.
export default function Example() {
  return (
    <div className="ex-grid">
      <Card
        title="Quotes"
        icon={
          <StatusDisc tone="info">
            <StateGlyph name="chart" size={18} />
          </StatusDisc>
        }
        flush
        stretch
        footer={<Button size="sm" variant="secondary">See all</Button>}
      >
        <StockTable caption="Quotes" quotes={quotes.slice(0, 3)} columns={['symbol', 'ltp', 'change']} bare />
      </Card>
      <Card title="Short card" stretch footer={<Button size="sm">Add</Button>}>
        <p>The footer stays at the bottom however short the content.</p>
      </Card>
    </div>
  );
}
