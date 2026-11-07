import { Card } from '@punji/ui/card';
import { CardSection, CardSectionRow } from '@punji/ui/card-section';
import { MoneyDisplay } from '@punji/ui/money-display';

// A flush Card has no padding of its own; each CardSection brings its own, and a hairline sits between sections.
// The row sets two sections side by side once it is 880px wide.
export default function Example() {
  return (
    <Card flush label="Holdings summary">
      <CardSection title="Holdings" note="as of close" titleId="cs-h" aside={<span>NPR</span>}>
        <p style={{ margin: 0 }}>Nabil Bank, Nepal Telecom and Himalayan Bank make up 62% of the portfolio.</p>
      </CardSection>
      <CardSectionRow weights={[3, 2]}>
        <CardSection title="Bought" headingLevel={3} titleId="cs-b">
          <MoneyDisplay currency="NPR" value={18450000n} />
        </CardSection>
        <CardSection title="Sold" headingLevel={3} titleId="cs-s">
          <MoneyDisplay currency="NPR" value={7120000n} />
        </CardSection>
      </CardSectionRow>
      <CardSection foot>
        <p>Source: broker statements. Nothing here is advice.</p>
      </CardSection>
    </Card>
  );
}
