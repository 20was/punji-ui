import { LoanCalculator } from '@punji/ui/loan-calculator';
import { nepalMoneyConfig } from '@punji/ui/money';

// Devanagari digits, whole-rupee instalments rounded up (as many lenders quote them) and Nepali words.
export default function Example() {
  return (
    <LoanCalculator
      defaultAmount="500000"
      defaultRatePercent="13"
      defaultMonths={36}
      digits="deva"
      rounding="ceil"
      roundTo={100n}
      allowPrepayment={false}
      money={nepalMoneyConfig({ language: 'ne', digits: 'deva' })}
      labels={{
        amount: 'कर्जा रकम', rate: 'ब्याजदर (वार्षिक)', tenure: 'अवधि', tenureUnit: 'अवधि एकाइ', years: 'वर्ष', months: 'महिना',
        emi: 'मासिक किस्ता (EMI)', totalInterest: 'कुल ब्याज', totalPayable: 'कुल तिर्नुपर्ने', showSchedule: 'किस्ता तालिका हेर्नुहोस्', hideSchedule: 'किस्ता तालिका लुकाउनुहोस्',
        incomplete: 'किस्ता हेर्न रकम, ब्याजदर र अवधि लेख्नुहोस्।', disclaimer: 'घट्दो मौज्दातमा मासिक ब्याज जोडेर गरिएको अनुमान। बैंकको प्रस्ताव पत्र नै अन्तिम हो।',
      }}
    />
  );
}
