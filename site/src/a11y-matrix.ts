// The per-component accessibility table on /accessibility/, generated from the registry so it cannot be typed by
// hand or drift: one row per component page, built from its `apg`, `keyboard`, `spoken`, `accessibility` and
// `stability` fields. test/accessibility-statement.test.ts fails when a component page lacks the fields it needs.
import type { GuideTable, PageDef } from './registry.ts';
import { pagePath } from './paths.ts';

/** The words a cell shows when a page declares nothing: said plainly, never filled in. */
export const NOT_DECLARED = 'Not declared in the registry';

const plain = (text: string): string => text.replaceAll('`', '').replaceAll('[', '(').replaceAll(']', ')').replace(/\s+/g, ' ').trim();

/** Cuts at a word boundary so a cell stays one or two lines; the full text is on the component page. */
export function brief(text: string, max: number): string {
  const clean = plain(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max).replace(/\s+\S*$/, '');
  return `${cut}…`;
}

/** The component pages the table covers. */
export const matrixPages = (pages: readonly PageDef[]): PageDef[] =>
  pages.filter((p) => p.kind === 'component').toSorted((a, b) => a.title.localeCompare(b.title));

export interface MatrixStats {
  components: number;
  withApg: number;
  withSpoken: number;
}

export function matrixStats(pages: readonly PageDef[]): MatrixStats {
  const rows = matrixPages(pages);
  return { components: rows.length, withApg: rows.filter((p) => p.apg).length, withSpoken: rows.filter((p) => p.spoken?.length).length };
}

export function buildMatrix(pages: readonly PageDef[]): GuideTable {
  const rows = matrixPages(pages).map((p) => {
    const first = p.keyboard[0] ?? '';
    const more = p.keyboard.length > 1 ? ` (+${p.keyboard.length - 1} more)` : '';
    const sr = p.spoken?.[0] ?? p.accessibility[0] ?? '';
    return [
      `[${plain(p.title)}](${pagePath(p)})`,
      p.stability ?? '',
      p.apg ? `[${plain(p.apg.name)}](${p.apg.url})` : NOT_DECLARED,
      `${brief(first, 130)}${more}`,
      p.spoken?.length ? `Spoken: ${brief(sr, 150)}` : brief(sr, 150),
    ];
  });
  return {
    caption: 'Accessibility by component, generated from the registry',
    head: ['Component', 'Stability', 'APG pattern', 'Keyboard', 'Screen-reader notes'],
    rows,
  };
}

/** The paragraph under the heading, with the counts taken from the same data as the table. */
export function matrixNote(pages: readonly PageDef[]): string {
  const s = matrixStats(pages);
  return `${s.components} component pages are listed. ${s.withApg} name a WAI-ARIA Authoring Practices pattern and ${s.withSpoken} record what a screen reader says; for the rest the table shows the first accessibility note from the page. Where the pattern column says "${NOT_DECLARED}", that is a gap in this documentation, not a claim that no pattern applies: most such components are native elements (button, input, table) or compositions of other components. Each component name opens its page, which has the full keyboard and accessibility lists.`;
}
