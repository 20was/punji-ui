import { describe, expect, it } from 'vitest';
import { GROUPS, PAGES } from '../site/src/registry.ts';
import { tokenize } from '../site/src/app/highlight.ts';

describe('docs site tokenizer', () => {
  it('never changes the text', () => {
    const source = "import { A } from '@punji/ui';\n// c\nconst x = <A v={12n} s=\"a\\\"b\" />; /* m */ `t${1}`";
    expect(tokenize(source).map((t) => t.text).join('')).toBe(source);
  });
});

// Example files and API entries are validated by scripts/site-gen.mjs (part of site:build and typecheck:site).
describe('docs site registry', () => {
  it('has unique slugs and known groups', () => {
    expect(new Set(PAGES.map((p) => p.slug)).size).toBe(PAGES.length);
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const page of PAGES) expect(groups.has(page.group)).toBe(true);
  });
  it('relates only to existing pages', () => {
    for (const page of PAGES) for (const slug of page.related) expect(PAGES.some((p) => p.slug === slug)).toBe(true);
  });
});
