import { Callout } from '@punji/ui/article';

// Five tones, each with its own icon and a title in words, so no tone depends on colour. Give `label` for a title of your own.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Callout>Settlement is T+2: the shares reach your account two trading days after the trade.</Callout>
      <Callout tone="info">Brokers charge commission on the value of the trade, in slabs.</Callout>
      <Callout tone="accent">You can check an allotment from the registrar's page without logging in to your broker.</Callout>
      <Callout tone="warn" label="Proposed, not in force">The new rate is a plan. The current rate still applies today.</Callout>
      <Callout tone="danger">A margin call can force a sale at the price of the day, whatever you paid.</Callout>
    </div>
  );
}
