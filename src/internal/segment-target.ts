/**
 * PLACEHOLDER (pipeline proof). Copied from the in-repo kit's format.ts so the
 * build, tests and size gates have real code to run on. The real kit arrives in
 * the extraction PR.
 *
 * The next value a segmented control moves to for an arrow, Home or End key.
 * Wraps at both ends. Returns null for any other key.
 */
export function segmentTarget<T extends string>(values: readonly T[], current: T, key: string): T | null {
  const i = values.indexOf(current);
  const n = values.length;
  if (n === 0) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return values[(i + 1 + n) % n] ?? null;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return values[(i - 1 + n) % n] ?? null;
  if (key === 'Home') return values[0] ?? null;
  if (key === 'End') return values[n - 1] ?? null;
  return null;
}
