import { RiskReturnScatter } from '@punji/ui/risk-return-scatter';

export default function Example() {
  return (
    <RiskReturnScatter
      label="Funds, risk against return"
      benchmark={{ label: 'NEPSE index', riskPct: 14, returnPct: 8 }}
      points={[
        { key: 'eq', label: 'Equity fund', riskPct: 18.2, returnPct: 12.4, group: 'Equity' },
        { key: 'sm', label: 'Small-cap fund', riskPct: 24.5, returnPct: 9.9, group: 'Equity' },
        { key: 'bal', label: 'Balanced fund', riskPct: 9.8, returnPct: 8.0, group: 'Mixed' },
        { key: 'bd', label: 'Bond fund', riskPct: 4.1, returnPct: 5.6, group: 'Bond' },
        { key: 'mm', label: 'Money market', riskPct: 0.6, returnPct: 3.1, group: 'Cash' },
      ]}
    />
  );
}
