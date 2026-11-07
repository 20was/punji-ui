/** True when what was typed confirms `match`: equal, ignoring case and spaces at either end. An empty `match` never confirms. */
export function confirmMatches(typed: string, match: string): boolean {
  const want = match.trim().toLowerCase();
  return want.length > 0 && typed.trim().toLowerCase() === want;
}
