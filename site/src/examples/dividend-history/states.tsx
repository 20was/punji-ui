import { DividendHistory } from '@punji/ui/dividend-history';

export default function Example() {
  return (
    <div className="ex-stack">
      <DividendHistory entries={[]} caption="Dividends, loading" state="loading" />
      <DividendHistory entries={[]} caption="Dividends, empty" emptyLabel="No dividends received yet." />
      <DividendHistory entries={[]} caption="Dividends, error" state="error" onRetry={() => undefined} />
    </div>
  );
}
