import { IncomeTaxCalculator } from '@punji/ui/income-tax-calculator';
import type { TaxSlab } from '@punji/ui/tax';

// EXAMPLE slabs in the shape of Nepal's FY 2081/82 resident individual table (amounts in paisa). They are here to
// show the data shape, not as tax advice: take the slabs, caps and rebates from the Finance Act for the year you show.
const LAKH = 10_000_000n;
const single: TaxSlab[] = [
  { width: 5n * LAKH, rate: '0.01', label: 'First 5 lakh (social security tax)', waivable: true },
  { width: 2n * LAKH, rate: '0.1' },
  { width: 3n * LAKH, rate: '0.2' },
  { width: 10n * LAKH, rate: '0.3' },
  { width: 30n * LAKH, rate: '0.36' },
  { width: null, rate: '0.39' },
];
const couple: TaxSlab[] = [
  { width: 6n * LAKH, rate: '0.01', label: 'First 6 lakh (social security tax)', waivable: true },
  { width: 2n * LAKH, rate: '0.1' },
  { width: 3n * LAKH, rate: '0.2' },
  { width: 9n * LAKH, rate: '0.3' },
  { width: 30n * LAKH, rate: '0.36' },
  { width: null, rate: '0.39' },
];

export default function Example() {
  return (
    <IncomeTaxCalculator
      fiscalYear="Example rates in the shape of FY 2081/82. Check the current Finance Act."
      slabs={{ single, couple }}
      retirementRule={{ cap: 5n * LAKH, fraction: { numerator: 1n, denominator: 3n } }}
      deductions={[
        { id: 'life', label: 'Life insurance premium', cap: 4_000_000n },
        { id: 'health', label: 'Health insurance premium', cap: 2_000_000n },
      ]}
      rebates={[{ id: 'women', label: 'Rebate for women with only remuneration income (10%)', rate: '0.1' }]}
      defaultValues={{ income: '1200000', amounts: { cit: '120000' } }}
    />
  );
}
