import { MarketMovers } from '@punji/ui/market-movers';
import { quotes } from '../../sample.ts';

// Most active ranked by shares traded, three rows a tab, red-up convention, Nepali tab names.
export default function Example() {
  return (
    <MarketMovers
      quotes={quotes}
      label="बजार चलायमान"
      defaultTab="active"
      activeBy="volume"
      limit={3}
      convention="red-up"
      density="compact"
      tabLabels={{ gainers: 'वृद्धि', losers: 'ह्रास', active: 'सक्रिय' }}
      emptyLabels={{ gainers: 'आज कुनै वृद्धि छैन', losers: 'आज कुनै ह्रास छैन', active: 'कारोबार छैन' }}
    />
  );
}
