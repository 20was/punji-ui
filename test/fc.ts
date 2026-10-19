/**
 * fast-check settings shared by every property test. `FC_NUM_RUNS` (default
 * 100) sets how many inputs each property tries; `npm run test:deep` runs
 * 2000, so a rare input is found before a push rather than in CI. A failure
 * prints its seed and path: pass them to that `fc.assert` to replay it.
 */
import * as fc from 'fast-check';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
export const NUM_RUNS = Number(env.FC_NUM_RUNS ?? 100);

fc.configureGlobal({ numRuns: NUM_RUNS });

/** Runs for a property that renders (slower): its own count, scaled up on a deep run. */
export const deep = (runs: number) => ({ numRuns: Math.max(runs, Math.round(NUM_RUNS / 10)) });
