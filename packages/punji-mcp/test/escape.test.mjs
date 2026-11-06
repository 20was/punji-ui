// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { componentMarkdown } from '../src/handlers.mjs';

const snapshot = JSON.parse(readFileSync(new URL('./fixture/snapshot.json', import.meta.url), 'utf8'));

describe('markdown table cells', () => {
  it('escapes backslashes and pipes, leaving other metacharacters alone', () => {
    const props = [{ name: 'p', type: 'a | b \\ ^$.*+?()[]{}', description: 'back\\slash | pipe', required: true }];
    const item = { ...snapshot.items[0], uxOnly: false, exports: [{ name: 'X', kind: 'component', import: "import { X } from '@punji/ui/x';", props }] };
    const md = componentMarkdown(item);
    expect(md).toContain('`a \\| b \\\\ ^$.*+?()[]{}`');
    expect(md).toContain('back\\\\slash \\| pipe');
  });
});
