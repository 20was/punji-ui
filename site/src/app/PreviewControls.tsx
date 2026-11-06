import { useEffect, useId } from 'react';
import { DEFAULT_PREFS, DENSITIES, LOCALES, PREVIEW_THEMES, setPreviewPrefs, syncUrl, usePreviewPrefs, type PreviewDensity, type PreviewLocale, type PreviewTheme } from './preview.ts';

/**
 * The global preview controls: locale, density and theme for every example stage on every page (and the phone-width
 * frame). Native selects, so they are keyboard and screen-reader complete at no cost. The choice is stored, and the
 * address bar carries it, so a link reproduces the view (see preview.ts).
 */
export function PreviewControls() {
  const prefs = usePreviewPrefs();
  const id = useId();
  // A page reached by navigation drops the query: put the stored view back in the address bar.
  useEffect(() => syncUrl(), []);
  const changed = prefs.locale !== DEFAULT_PREFS.locale || prefs.density !== DEFAULT_PREFS.density || prefs.theme !== null;
  return (
    <div className="doc-preview-bar" role="group" aria-label="Preview settings, applied to every example" data-testid="preview-controls">
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
      <label htmlFor={`${id}-theme`}>
        <span>Theme</span>
        <select id={`${id}-theme`} value={prefs.theme ?? ''} onChange={(e) => setPreviewPrefs({ theme: (e.target.value || null) as PreviewTheme | null })} data-testid="preview-theme">
          <option value="">Follow site</option>
          {PREVIEW_THEMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="doc-preview-reset" disabled={!changed} onClick={() => setPreviewPrefs(DEFAULT_PREFS)}>
        Reset
      </button>
    </div>
  );
}
