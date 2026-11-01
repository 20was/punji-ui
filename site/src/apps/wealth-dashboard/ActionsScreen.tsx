import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { ChipRow } from '@punji/ui/controls';
import { CorporateActionTimeline } from '@punji/ui/corporate-action-timeline';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { ACTIONS, useWealth } from './store.ts';

/** Corporate actions for the scrips held: announcements, book closes, AGMs, rights windows and distributions, past and coming. */
export default function ActionsScreen() {
  const { derived } = useWealth();
  const held = new Set(derived.summary.holdings.map((h) => h.symbol));
  const symbols = Object.keys(ACTIONS).filter((s) => held.has(s));
  const [symbol, setSymbol] = useState<string>(symbols[0] ?? '');
  return (
    <div className="app-stack">
      <ScreenTitle>Corporate actions</ScreenTitle>
      {symbols.length > 0 && <ChipRow label="Scrip" prefix="wd-actions" value={symbol} onChange={setSymbol} options={symbols.map((s) => ({ value: s, label: s, count: ACTIONS[s]!.length }))} />}
      <Card title={symbol || 'No actions'} description="Bikram Sambat dates first, Gregorian under them" headingLevel={3}>
        {symbol ? (
          <CorporateActionTimeline events={ACTIONS[symbol]!} today={SESSION_DATE} label={`${symbol} corporate actions`} testId="wd-timeline" />
        ) : (
          <p className="app-muted">None of your holdings has an announced action.</p>
        )}
      </Card>
    </div>
  );
}
