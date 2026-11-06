import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { StatusBanner } from '@punji/ui/status-banner';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount } from '../shared/moneyCells.tsx';
import { PERIOD } from './recon.ts';
import { STATEMENT_CLOSING, useRecon } from './store.ts';

/** Where the month stands: the two closing balances, how much is matched, and every exception that needs a person. */
export function Overview() {
  const { derived, dispatch, go } = useRecon();
  const { summary, exceptions, acknowledged, suggestions, statement, matchedStatement, percent, ledgerClosing, reconciled } = derived;
  const timing = summary.unmatchedLedger.length;
  return (
    <div className="app-stack">
      <ScreenTitle>Overview</ScreenTitle>
      <MetricRow label={`Reconciliation of ${PERIOD.label}`} count={4} testId="rc-kpis">
        <MetricTile label="Balance per bank" value={<Amount value={STATEMENT_CLOSING} testId="rc-kpi-bank" />} note="Statement closing, 31 Oct" />
        <MetricTile label="Balance per books" value={<Amount value={ledgerClosing} testId="rc-kpi-books" />} note="Account 1010, 31 Oct" />
        <MetricTile label="Matched" value={<span data-testid="rc-kpi-matched">{percent}%</span>} note={`${matchedStatement} of ${statement.length} statement lines`} />
        <MetricTile tone="inverse" label="Open exceptions" value={<span data-testid="rc-kpi-exceptions">{exceptions.length}</span>} note={reconciled ? 'Nothing left to review' : `${timing} timing ${timing === 1 ? 'item' : 'items'} on the books side`} />
      </MetricRow>

      <section className="rc-banners" aria-labelledby="rc-exceptions-h" data-testid="rc-exceptions">
        <h3 id="rc-exceptions-h" className="rc-h">
          Exceptions
        </h3>
        {exceptions.length === 0 ? (
          <StatusBanner tone="info" title="Reconciled" testId="rc-reconciled">
            Every statement line is matched or acknowledged, and the reconciliation statement closes to the paisa. Export the report from the Report tab.
          </StatusBanner>
        ) : (
          exceptions.map((e) => (
            <StatusBanner
              key={e.id}
              tone={e.tone}
              title={e.title}
              action={e.kind === 'unrecorded' ? { label: 'Book in the queue', onClick: () => go('queue') } : { label: 'Acknowledge', onClick: () => dispatch({ type: 'acknowledge', id: e.id }) }}
              testId={`rc-ex-${e.kind}`}
            >
              {e.detail}
            </StatusBanner>
          ))
        )}
      </section>

      {acknowledged.length > 0 && (
        <Card title="Acknowledged" description="Someone has taken these on (a dispute with the bank, a correction requested). They stay in the export." headingLevel={3} testId="rc-acknowledged">
          <ul className="rc-ack">
            {acknowledged.map((e) => (
              <li key={e.id}>
                <span>{e.title}</span>
                <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'reopen', id: e.id })} aria-label={`Reopen: ${e.title}`} testId={`rc-reopen-${e.kind}`}>
                  Reopen
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Next steps" description="Work the queue from the top: suggestions first, then the exceptions." headingLevel={3}>
        <div className="rc-actions">
          <Button size="sm" onClick={() => dispatch({ type: 'suggest' })} disabled={suggestions.length === 0} testId="rc-suggest">
            Accept {suggestions.length} {suggestions.length === 1 ? 'suggestion' : 'suggestions'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => go('queue')} testId="rc-open-queue">
            Open the queue ({summary.unmatchedStatement.length} bank, {summary.unmatchedLedger.length} books)
          </Button>
          <Button size="sm" variant="ghost" onClick={() => go('report')}>
            Report and export
          </Button>
        </div>
        <p className="app-muted app-small">
          Lines with the same reference and amount were matched on arrival. A suggestion has the same exact amount within three days. Nothing is matched unless both sides agree to the paisa.
        </p>
      </Card>
    </div>
  );
}
