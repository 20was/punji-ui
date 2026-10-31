import { useState } from 'react';
import { MarketMovers, type MoverKind } from '@punji/ui/market-movers';
import { quotes } from '../../sample.ts';

export default function Example() {
  const [tab, setTab] = useState<MoverKind>('gainers');
  return (
    <MarketMovers
      quotes={quotes}
      label="Market movers"
      tab={tab}
      onTabChange={setTab}
      limit={5}
      footer="As of the 14 Nov close. Synthetic data."
    />
  );
}
