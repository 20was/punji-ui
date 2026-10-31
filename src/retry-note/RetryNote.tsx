/**
 * RetryNote (design.punji.app/components/retry-note): one part of a page did
 * not load, said in its own place with a Try again, while the rest of the page
 * stays as it is (a card's figures, a list's lines). An alert, so screen
 * readers hear it; the retry is a real button. A whole page that failed is an
 * EmptyState instead.
 */
import type { ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { ToneIcon } from '../states/States.tsx';

export function RetryNote({ children, retryLabel, onRetry, testId }: {
  /** What did not load, and why if it is known ("Could not load your holdings"). */
  children: ReactNode;
  /** The retry button's words ("Try again"): required, the package carries no copy. */
  retryLabel: string;
  onRetry: () => void;
  testId?: string;
}) {
  return (
    <div className="kit-retry" role="alert" data-testid={testId}>
      <ToneIcon tone="error" />
      <span className="kit-retry-tx">{children}</span>
      <Button variant="ghost" size="sm" onClick={onRetry} testId={testId ? `${testId}-retry` : undefined}>
        {retryLabel}
      </Button>
    </div>
  );
}
