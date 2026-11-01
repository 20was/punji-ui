import { createMoneyFormatter, type MoneyFormatConfig } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';

const AMOUNT = 123456789n; // minor units
const ROWS: { label: string; config: MoneyFormatConfig }[] = [
  { label: 'India (en-IN)', config: { currency: 'INR', locale: 'en-IN' } },
  { label: 'Bangladesh (bn-BD)', config: { currency: 'BDT', locale: 'bn-BD' } },
  { label: 'Pakistan, lakh grouping', config: { currency: 'PKR', locale: 'en-PK', grouping: 'south-asian', exponent: 2 } },
  { label: 'Sri Lanka (en-LK)', config: { currency: 'LKR', locale: 'en-LK' } },
  { label: 'Kuwait (ar-KW), 3 decimals', config: { currency: 'KWD', locale: 'ar-KW' } },
  { label: 'Thailand, Thai digits', config: { currency: 'THB', locale: 'th-TH', numberingSystem: 'thai' } },
  { label: 'Japan, no decimals', config: { currency: 'JPY', locale: 'ja-JP' } },
];

export default function Example() {
  return (
    <DataRows label="123456789 minor units in each currency">
      {ROWS.map(({ label, config }) => (
        <DataRow key={label} label={label} value={<span lang={config.locale}>{createMoneyFormatter(config).format(AMOUNT)}</span>} />
      ))}
    </DataRows>
  );
}
