import { RiskReturnScatter } from '@punji/ui/risk-return-scatter';

export default function Example() {
  return (
    <RiskReturnScatter
      label="Portfolios against the efficient frontier"
      frontier={[
        { riskPct: 2, returnPct: 4.2 },
        { riskPct: 6, returnPct: 7.1 },
        { riskPct: 10, returnPct: 9.2 },
        { riskPct: 15, returnPct: 10.8 },
        { riskPct: 22, returnPct: 12 },
      ]}
      labels={{ frontier: 'Efficient frontier (model)' }}
      points={[
        { key: 'a', label: 'Cautious mix', riskPct: 5, returnPct: 5.9 },
        { key: 'b', label: 'Balanced mix', riskPct: 10.5, returnPct: 8.4 },
        { key: 'c', label: 'Growth mix', riskPct: 17, returnPct: 10.1 },
        { key: 'd', label: 'Concentrated', riskPct: 21, returnPct: 8.7 },
      ]}
    />
  );
}
