import { Button } from '@punji/ui/button';
import { useClipboard } from '@punji/ui/hooks';
import { tokenize } from './highlight.ts';

export function Code({ code, label }: { code: string; label: string }) {
  const { copy, copied, error, supported } = useClipboard();
  const trimmed = code.replace(/\n+$/, '');
  return (
    <div className="doc-code">
      <div className="doc-code-bar">
        <span className="doc-code-label">{label}</span>
        {supported && (
          <Button size="sm" variant="secondary" onClick={() => void copy(trimmed)} aria-label={`Copy ${label}`} testId="copy-code">
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
        <span role="status" className="kit-sr">
          {copied ? `${label} copied to the clipboard` : error ? 'Copy failed' : ''}
        </span>
      </div>
      {/* Focusable so keyboard users can scroll long code (axe: scrollable-region-focusable). */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label={label}>
        <code>
          {tokenize(trimmed).map((token, i) => (token.kind === 'plain' ? token.text : <span key={i} className={`tok-${token.kind}`}>{token.text}</span>))}
        </code>
      </pre>
    </div>
  );
}
