// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOPICS } from '../src/handlers.mjs';

const script = fileURLToPath(new URL('../scripts/build-data.mjs', import.meta.url));
const rootPkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));

describe('build-data (registry-sources fallback)', () => {
  it('writes a snapshot of the expected shape without site/dist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'punji-mcp-'));
    const out = join(dir, 'snapshot.json');
    try {
      execFileSync(process.execPath, [script, '--fallback', '--out', out], { stdio: 'pipe' });
      const s = JSON.parse(readFileSync(out, 'utf8'));
      expect(s.version).toBe(rootPkg.version);
      expect(s.source).toBe('site registry sources');
      expect(s.items.length).toBeGreaterThan(100);
      for (const key of ['slug', 'title', 'kind', 'group', 'description', 'exports', 'examples', 'stability']) expect(s.items[0]).toHaveProperty(key);
      expect(Object.keys(s.guides).toSorted()).toEqual([...TOPICS].toSorted());
      for (const topic of TOPICS) expect(s.guides[topic].length).toBeGreaterThan(200);
      expect(s.items.some((i) => i.uxOnly)).toBe(true);
      expect(typeof s.llms).toBe('string');
      expect(s.moneyProps).toBeTypeOf('object');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
