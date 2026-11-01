import { useState } from 'react';
import { useClipboard } from '@punji/ui/hooks';
import { hrefFor } from './router.tsx';

/**
 * The page as Markdown, for people pasting into an assistant and for agents: copy it, open the raw file (the
 * prerender writes index.md beside every index.html), or open ChatGPT or Claude with a prompt that points at it.
 * Plain links and one same-origin fetch; no third-party script.
 */
export function PageActions({ path, title }: { path: string; title: string }) {
  const { copy, copied, error, supported } = useClipboard();
  const [failed, setFailed] = useState(false);
  const md = hrefFor(`${path}index.md`);
  const prompt = `Read ${SITE_ORIGIN}${md} and help me use ${title} from @punji/ui in my React app.`;
  const onCopy = async () => {
    setFailed(false);
    try {
      const response = await fetch(md);
      if (!response.ok) throw new Error(String(response.status));
      await copy(await response.text());
    } catch {
      setFailed(true);
    }
  };
  return (
    <div className="doc-actions" role="group" aria-label="This page for AI assistants">
      {supported && (
        <button type="button" className="doc-action" onClick={() => void onCopy()} data-testid="copy-markdown" data-copied={copied || undefined}>
          {copied ? 'Copied' : 'Copy page as Markdown'}
        </button>
      )}
      <a className="doc-action" href={md} type="text/markdown">
        View as Markdown
      </a>
      <a className="doc-action" href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`} target="_blank" rel="noopener noreferrer">
        Open in ChatGPT
      </a>
      <a className="doc-action" href={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`} target="_blank" rel="noopener noreferrer">
        Open in Claude
      </a>
      <span role="status" className="kit-sr">
        {copied ? 'Page Markdown copied to the clipboard' : error || failed ? 'Copy failed' : ''}
      </span>
    </div>
  );
}
