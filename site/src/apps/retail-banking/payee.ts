// The simulated receiving bank's name check (Confirmation of Payee). A real bank answers this on its server; the app
// only shows the answer with `PayeeVerification`.
import type { PayeeVerificationResult } from '@punji/ui/payee-verification';

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'shri', 'shree', 'sri', 'smt', 'sushri', 'km', 'ji']);

/** Lower case, letters and digits only, honorifics dropped, as words. */
export function nameWords(name: string): string[] {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !HONORIFICS.has(w));
}

const sortedWords = (w: readonly string[]) => w.toSorted().join(' ');

/** Edit distance on at most 64 characters each. */
function distance(a: string, b: string): number {
  const x = a.slice(0, 64);
  const y = b.slice(0, 64);
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= y.length; j += 1) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length]!;
}

/**
 * A match when the words agree in any order; a close match for initials ("H. B. Khatri"), a dropped middle name or a
 * small misspelling (one edit in five letters); otherwise no match.
 */
export function compareNames(entered: string, registered: string): Exclude<PayeeVerificationResult, 'checking' | 'unavailable'> {
  const a = nameWords(entered);
  const b = nameWords(registered);
  if (a.length === 0 || b.length === 0) return 'no-match';
  if (sortedWords(a) === sortedWords(b)) return 'match';
  if (a.at(-1) === b.at(-1)) {
    const rest = b.slice(0, -1);
    let j = 0;
    let fits = true;
    for (const word of a.slice(0, -1)) {
      while (j < rest.length && !(rest[j] === word || (word.length === 1 && rest[j]!.startsWith(word)))) j += 1;
      if (j === rest.length) {
        fits = false;
        break;
      }
      j += 1;
    }
    if (fits) return 'close-match';
  }
  const x = a.join(' ');
  const y = b.join(' ');
  return distance(x, y) * 5 <= Math.max(x.length, y.length) ? 'close-match' : 'no-match';
}
