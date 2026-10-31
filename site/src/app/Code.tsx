import { useState } from 'react';
import { useClipboard } from '@punji/ui/hooks';
import { tokenize } from './highlight.ts';
import { CheckIcon, CopyIcon } from './icons.tsx';

/** A copy button with visible and spoken feedback. Hidden where the Clipboard API is missing. */
export function CopyButton({ text, label, className = 'doc-copy' }: { text: string; label: string; className?: string }) {
  const { copy, copied, error, supported } = useClipboard();
  return (
    <>
      {supported && (
        <button type="button" className={className} onClick={() => void copy(text)} aria-label={`Copy ${label}`} data-testid="copy-code" data-copied={copied || undefined}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      )}
      <span role="status" className="kit-sr">
        {copied ? `${label} copied to the clipboard` : error ? 'Copy failed' : ''}
      </span>
    </>
  );
}

const CODE_PEEK_LINES = 30;

/**
 * A code block: a title bar (file name or label, language, copy) over highlighted, unwrapped code that scrolls sideways.
 * `label` is the accessible name of the code; `title` is what the bar shows (defaults to the label).
 */
export function Code({ code, label, title, lang, flush }: { code: string; label: string; title?: string; lang?: string; flush?: boolean }) {
  const trimmed = code.replace(/\n+$/, '');
  // A long block (a guide's full file) opens as a peek under a fade, with a button for the rest. The example frame
  // (flush) does the same around its own code, so it is skipped here.
  const lines = trimmed.split('\n').length;
  const long = !flush && lines > CODE_PEEK_LINES;
  const [full, setFull] = useState(false);
  return (
    <div className={`doc-code${flush ? ' is-flush' : ''}${long && !full ? ' is-peek' : ''}`}>
      <div className="doc-code-bar">
        <span className="doc-code-title">{title ?? label}</span>
        {lang && <span className="doc-code-lang">{lang}</span>}
        <CopyButton text={trimmed} label={label} />
      </div>
      {/* Focusable so keyboard users can scroll long code (axe: scrollable-region-focusable). */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label={label}>
        <code>
          {tokenize(trimmed).map((token, i) => (token.kind === 'plain' ? token.text : <span key={i} className={`tok-${token.kind}`}>{token.text}</span>))}
        </code>
      </pre>
      {long && (
        <button type="button" className="doc-code-more" aria-expanded={full} onClick={() => setFull((f) => !f)}>
          {full ? 'Show less' : `Show all ${lines} lines`}
        </button>
      )}
    </div>
  );
}
