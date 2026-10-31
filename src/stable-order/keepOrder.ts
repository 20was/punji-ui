/** Preserve row positions while live values change. Keys must be unique. */
export function keepOrder(previous: readonly string[], next: readonly string[]): readonly string[] {
  if (new Set(previous).size !== previous.length || new Set(next).size !== next.length) throw new Error('Stable order requires unique keys');
  if (previous.length !== next.length) return next;
  const keys = new Set(previous);
  return next.every(key => keys.has(key)) ? previous : next;
}
