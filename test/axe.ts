import axe from 'axe-core';

/**
 * Runs axe-core on a rendered container and returns the serious and critical
 * violations as readable lines. jsdom has no layout, so colour-contrast is
 * checked in the browser screenshot pass, not here.
 */
export async function seriousViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
}
