import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { NOT_DECLARED } from '../site/src/a11y-matrix.ts';
import { PAGES, STABILITY_LEVELS, pageBySlug } from '../site/src/registry.ts';

// The accessibility statement (site/src/registry-guides.ts, slug 'accessibility') builds its per-component table from
// registry fields. These tests fail when a component page loses a field the table uses, when the table stops
// covering every component, when the contrast numbers on the page drift from scripts/check-contrast.mjs, and when a
// screen-reader result claims more than a dated manual run.

const components = PAGES.filter((p) => p.kind === 'component');
const statement = pageBySlug('accessibility');
const section = (id: string) => statement?.guide?.find((s) => s.id === id);

describe('accessibility statement: component fields', () => {
  it('has component pages to list', () => {
    expect(components.length).toBeGreaterThan(100);
  });

  it.each(components.map((p) => [p.slug, p] as const))('%s has keyboard and accessibility notes and a stability', (_slug, page) => {
    expect(page.keyboard.length, `${page.slug}: keyboard`).toBeGreaterThan(0);
    expect(page.accessibility.length, `${page.slug}: accessibility`).toBeGreaterThan(0);
    for (const line of [...page.keyboard, ...page.accessibility]) expect(line.trim(), `${page.slug}: empty line`).not.toBe('');
    expect(STABILITY_LEVELS, `${page.slug}: stability`).toContain(page.stability);
    expect(page.apg?.name.trim() ?? 'none', `${page.slug}: apg name`).not.toBe('');
    expect(page.apg?.url ?? 'https://www.w3.org/WAI/ARIA/apg/', `${page.slug}: apg url`).toMatch(/^https:\/\/www\.w3\.org\/WAI\/ARIA\/apg\//);
    for (const line of page.spoken ?? []) expect(line.trim(), `${page.slug}: empty spoken line`).not.toBe('');
  });
});

describe('accessibility statement: generated table', () => {
  it('exists, is in the registry and has one row per component page', () => {
    expect(statement, 'the accessibility guide page').toBeDefined();
    const table = section('matrix')?.table;
    expect(table, 'the generated matrix').toBeDefined();
    expect(table!.head).toEqual(['Component', 'Stability', 'APG pattern', 'Keyboard', 'Screen-reader notes']);
    expect(table!.rows.length).toBe(components.length);
    for (const row of table!.rows) {
      expect(row).toHaveLength(table!.head.length);
      for (const cell of row) expect(cell.trim()).not.toBe('');
    }
    for (const page of components) expect(table!.rows.some((r) => r[0]!.includes(`/${page.slug}/)`)), `${page.slug} is in the table`).toBe(true);
  });

  it('says plainly when a pattern is not declared, never inventing one', () => {
    const table = section('matrix')!.table!;
    const declared = components.filter((p) => p.apg).length;
    expect(table.rows.filter((r) => r[2] !== NOT_DECLARED)).toHaveLength(declared);
  });
});

describe('accessibility statement: numbers and claims', () => {
  it('quotes the contrast numbers scripts/check-contrast.mjs prints', () => {
    const out = execFileSync('node', ['scripts/check-contrast.mjs'], { encoding: 'utf8' });
    const m = /(\d+) pairs x (\d+) themes pass; lowest text ratio light ([\d.]+), dark ([\d.]+), light-hc ([\d.]+), dark-hc ([\d.]+)/.exec(out);
    expect(m, `unexpected contrast output: ${out}`).not.toBeNull();
    const [, pairs, themes, ...lowest] = m!;
    const text = section('automated')!.points!.join('\n');
    expect(text).toContain(`${pairs} colour pairs`);
    expect(themes).toBe('4');
    for (const ratio of lowest) expect(text, `lowest ratio ${ratio}`).toContain(ratio);
  });

  it('names the open gaps and how to report an issue', () => {
    const gaps = section('gaps')!.points!.join('\n');
    expect(gaps).toMatch(/No manual screen-reader testing/);
    expect(gaps).toMatch(/Firefox and WebKit/);
    expect(section('report')!.paragraphs.join('\n')).toMatch(/issues\/new/);
  });

  it('lists five screen-reader tasks, each pending unless it has a date', () => {
    const table = section('sr-results')!.table!;
    expect(table.rows).toHaveLength(5);
    const PENDING = 'Expected — awaiting manual verification';
    for (const row of table.rows) {
      const date = row[row.length - 1]!;
      const results = row.slice(2, -1);
      const pending = results.some((r) => r === PENDING);
      // A pending result has no date; any other result must be Pass, Fail or Partial and be dated.
      const valid = pending ? date === 'Not yet run' : results.every((r) => /^(Pass|Fail|Partial)\b/.test(r)) && /^\d{4}-\d{2}-\d{2}$/.test(date);
      expect(valid, `${row[0]}: ${results.join(' / ')} / ${date}`).toBe(true);
    }
    const scripts = (statement?.guide ?? []).filter((s) => s.id.startsWith('sr-task-'));
    expect(scripts).toHaveLength(5);
    for (const s of scripts) expect(s.paragraphs.join('\n'), `${s.id} has a result and date field`).toMatch(/Result: .* Date tested: /);
  });
});
