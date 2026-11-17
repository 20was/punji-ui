import { useEffect, useId, useRef, useState } from 'react';
import { DEFAULT_PREFS, DENSITIES, LOCALES, setPreviewPrefs, syncUrl, usePreviewPrefs, type PreviewDensity, type PreviewLocale, type PreviewTheme } from './preview.ts';
import { SlidersIcon } from './icons.tsx';

const isHc = (theme: PreviewTheme | null) => theme === 'light-hc' || theme === 'dark-hc';

/**
 * The preview settings menu, one button in each example's stage toolbar next to the width and light/dark buttons:
 * locale, density and high contrast for every example stage on every page (and the phone-width frame). The light and
 * dark choice stays on the toolbar's sun and moon buttons, the only theme control; high contrast keeps whichever of
 * the two is showing. Native selects and a checkbox, so the panel is keyboard and screen-reader complete; Escape or a
 * click outside closes it and Escape returns focus to the button. The choice is stored, and the address bar carries
 * it, so a link reproduces the view (see preview.ts).
 */
export function PreviewSettings({ shown }: { shown: 'light' | 'dark' }) {
  const prefs = usePreviewPrefs();
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // A page reached by navigation drops the query: put the stored view back in the address bar.
  useEffect(() => syncUrl(), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const hc = isHc(prefs.theme);
  const changed = prefs.locale !== DEFAULT_PREFS.locale || prefs.density !== DEFAULT_PREFS.density || prefs.theme !== null;
  return (
    <div className="doc-pref" ref={root} data-testid="preview-settings">
      <button
        ref={button}
        type="button"
        className="doc-pref-btn"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label="Preview settings"
        title="Preview settings: locale, density, high contrast"
        data-changed={changed || undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <SlidersIcon />
      </button>
      {open && (
        <div className="doc-pref-panel" id={`${id}-panel`} role="group" aria-label="Preview settings, applied to every example">
          <label htmlFor={`${id}-locale`}>
            <span>Locale</span>
            <select id={`${id}-locale`} value={prefs.locale} onChange={(e) => setPreviewPrefs({ locale: e.target.value as PreviewLocale })} data-testid="preview-locale">
              {LOCALES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-density`}>
            <span>Density</span>
            <select id={`${id}-density`} value={prefs.density} onChange={(e) => setPreviewPrefs({ density: e.target.value as PreviewDensity })} data-testid="preview-density">
              {DENSITIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="doc-pref-check" htmlFor={`${id}-hc`}>
            <input id={`${id}-hc`} type="checkbox" checked={hc} onChange={(e) => setPreviewPrefs({ theme: e.target.checked ? (`${shown}-hc` as PreviewTheme) : shown })} data-testid="preview-contrast" />
            <span>High contrast</span>
          </label>
          <button type="button" className="doc-preview-reset" disabled={!changed} onClick={() => setPreviewPrefs(DEFAULT_PREFS)}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
