import { lazy, Suspense, useEffect, useState } from 'react';
import { SearchIcon } from './icons.tsx';

// The palette and its index load on first use (hovering or focusing the button starts the download early).
const loadPalette = () => import('./SearchPalette.tsx');
const SearchPalette = lazy(loadPalette);
const prefetch = () => void loadPalette();

/**
 * The header search: a button that looks like a field, opening the package's own CommandPalette over every page's
 * title, lead, description and export names. Command-K or Ctrl-K opens it from anywhere; so does the slash key
 * when focus is not in a field.
 */
export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      } else if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  return (
    <>
      <button
        type="button"
        className="doc-search"
        onClick={() => setOpen(true)}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K /"
        data-testid="search"
      >
        <SearchIcon />
        <span className="doc-search-text">Search the docs</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
      {open && (
        <Suspense fallback={null}>
          <SearchPalette query={query} onQuery={setQuery} onClose={close} />
        </Suspense>
      )}
    </>
  );
}
