'use client';

/**
 * CodeBlock: a block of plain text in a monospace box, for output people read
 * or copy: a CSV export, a JSON payload, an account statement line by line.
 * No syntax highlighting. An optional label names it; an optional Copy button
 * puts the text on the clipboard.
 */
import { useId } from 'react';

import { Button } from '../button/Button.tsx';
import { useClipboard } from '../use-clipboard/useClipboard.ts';

export interface CodeBlockLabels {
  /** The copy button's name. Default "Copy". */
  copy: string;
  /** Announced after a successful copy. Default "Copied". */
  copied: string;
  /** Announced when the browser refuses the copy. Default "Could not copy". */
  copyFailed: string;
}

export const DEFAULT_CODE_BLOCK_LABELS: CodeBlockLabels = { copy: 'Copy', copied: 'Copied', copyFailed: 'Could not copy' };

export interface CodeBlockProps {
  /** The text, shown exactly as given: line breaks and spaces are kept, long lines wrap. */
  children: string;
  /** A caption over the block ("transactions.csv"). It also names the block for screen readers. */
  label?: string;
  /** Shows a Copy button that copies `children`. Default false. */
  copy?: boolean;
  /** Words for the copy button and its announcements; set them in the reader's language. */
  labels?: Partial<CodeBlockLabels>;
  /** A name for the block when there is no visible `label` ("Neutralised CSV"). */
  'aria-label'?: string;
  /** Layout only (margin in its container), never a restyle. */
  className?: string;
  /** Becomes data-testid on the block. */
  testId?: string;
}

export function CodeBlock({ children, label, copy, labels, 'aria-label': ariaLabel, className, testId }: CodeBlockProps) {
  const words = { ...DEFAULT_CODE_BLOCK_LABELS, ...labels };
  const clipboard = useClipboard();
  const labelId = useId();
  return (
    <figure className={`pu-code${className ? ` ${className}` : ''}`} aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel} data-testid={testId}>
      {(label || copy) && (
        <figcaption className="pu-code-head">
          {label && <p className="pu-code-label" id={labelId}>{label}</p>}
          {copy && (
            <>
              <Button variant="secondary" size="sm" onClick={() => { void clipboard.copy(children); }} disabled={!clipboard.supported}>
                {words.copy}
              </Button>
              <span className="kit-sr" role="status">{clipboard.copied ? words.copied : clipboard.error ? words.copyFailed : ''}</span>
            </>
          )}
        </figcaption>
      )}
      <pre className="pu-code-pre"><code>{children}</code></pre>
    </figure>
  );
}
