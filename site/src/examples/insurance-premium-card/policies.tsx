import { Button } from '@punji/ui/button';
import { InsurancePremiumCard } from '@punji/ui/insurance-premium-card';
import { premiumBreakdown } from '../../sample.ts';

// Insurer names are display strings in invented data. The breakdown's total is an exact bigint sum.
export default function Example() {
  return (
    <div className="ex-grid">
      <InsurancePremiumCard plan="Endowment Plus" insurer="Example Life Insurance" status="active" frequency="yearly" breakdown={premiumBreakdown}
        nextDueDate="2025-12-15" sumAssured={1_000_000_00n} termYears={20} policyNumber="EL-2019-004512" actions={<Button size="sm">Pay premium</Button>} />
      <InsurancePremiumCard plan="Term Life" insurer="Example Life Insurance" status="grace" frequency="monthly" premium={185_000n} nextDueDate="2025-11-20" sumAssured={2_500_000_00n} termYears={25} />
      <InsurancePremiumCard plan="Motor comprehensive" insurer="Example General Insurance" status="lapsed" frequency="single" premium={1_850_000n} />
    </div>
  );
}
