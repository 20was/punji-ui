import { Card } from '@punji/ui/card';
import { LinkRow, LinkRowList } from '@punji/ui/link-row';
import { StatusTag } from '@punji/ui/status-tag';

// The whole row is the link. The symbol never shrinks, the name truncates first, and the line wraps rather than cut
// a figure. In-app paths use your router through LinkProvider; here they are plain links.
export default function Example() {
  return (
    <Card title="Watchlist" flush>
      <div style={{ padding: '0 20px 8px' }}>
        <LinkRowList label="Watchlist">
          <LinkRow href="/components/card/" symbol="NABIL" name="Nabil Bank Limited" pill={<StatusTag>Banks</StatusTag>} line="Rs 1,250.00 · +1.20% today" value="Rs 1,250" caption="Today" />
          <LinkRow href="/components/rows/" symbol="NTC" name="Nepal Telecom" line="Rs 880.00 · -0.45% today" value="Rs 880" caption="Today" />
          <LinkRow href="/components/card-link/" symbol="HBL" name="Himalayan Bank Limited" line="Held: 0 units" value="No cash" tone="neutral" />
          <LinkRow href="/components/link-table/" symbol="SHL" name="Soaltee Hotel Limited" line="Down from your cost" value="-56.82%" tone="warn" caption="Since buy" />
        </LinkRowList>
      </div>
    </Card>
  );
}
