'use client';

/**
 * AllotmentChecker: checks one issue's allotment for many BOIDs at once (a family's accounts) instead of one
 * captcha at a time. Saved accounts are ticked by default; more BOIDs can be pasted one per line. Every BOID is
 * checked for shape before anything is sent, with the line and the problem in words; duplicates are dropped. The
 * check itself is yours (`onCheck`, to the registrar's result service through your server). Results come back as
 * one row per BOID with the outcome in words and a summary announced politely.
 */
import { useId, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { TextAreaField } from '../fields/Fields.tsx';
import { formatUnits } from '../internal/dualDate.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Select, type SelectOption } from '../select/Select.tsx';
import { boidMessage, checkBoid, formatBoid, normalizeBoid, type BoidOptions, type BoidProblem } from '../share-issues/boid.ts';
import { StatusPill } from '../status-pill/StatusPill.tsx';

export type AllotmentOutcome = 'allotted' | 'not-allotted' | 'not-applied' | 'pending' | 'error';

export const ALLOTMENT_OUTCOME_LABELS: Readonly<Record<AllotmentOutcome, string>> = Object.freeze({
  allotted: 'Allotted', 'not-allotted': 'Not allotted', 'not-applied': 'No application', pending: 'Result pending', error: 'Could not check',
});

const TONES: Record<AllotmentOutcome, 'gain' | 'warn' | 'loss' | undefined> = { allotted: 'gain', 'not-allotted': undefined, 'not-applied': undefined, pending: 'warn', error: 'loss' };

export interface AllotmentResult {
  /** The 16-digit BOID this result is for. */
  boid: string;
  outcome: AllotmentOutcome;
  /** Units allotted, when allotted. */
  units?: bigint;
  /** A line from the registrar or your server. Plain text. */
  message?: string;
}

export interface SavedBoid {
  boid: string;
  /** Whose account ("Sita Sharma", "Father"). */
  name: string;
}

export interface AllotmentRequest {
  /** The chosen issue's value, or null when no `issues` are given. */
  issueId: string | null;
  /** Valid, unique 16-digit BOIDs in the order shown. */
  boids: string[];
}

export interface AllotmentCheckerLabels {
  issue: string;
  saved: string;
  extra: string;
  extraHint: (max: number) => string;
  /** A BOID problem on one pasted line. */
  lineError: (line: number, problem: BoidProblem, digits: number) => string;
  none: string;
  tooMany: (max: number) => string;
  check: string;
  results: string;
  /** "2 of 3 allotted, 20 units in all". */
  summary: (allotted: number, total: number, units: string) => string;
  units: (units: string) => string;
  noResult: string;
  error: string;
  retry: string;
}

export const DEFAULT_ALLOTMENT_CHECKER_LABELS: AllotmentCheckerLabels = {
  issue: 'Issue',
  saved: 'Accounts to check',
  extra: 'Other BOIDs',
  extraHint: (max) => `One per line, or separated by commas. Up to ${max} in one check.`,
  lineError: (line, problem, digits) => `Line ${line}: ${boidMessage(problem, digits)}`,
  none: 'Choose an account or enter a BOID to check.',
  tooMany: (max) => `Check at most ${max} BOIDs at a time.`,
  check: 'Check results',
  results: 'Allotment results',
  summary: (a, t, u) => `${a} of ${t} allotted${a ? `, ${u} units in all` : ''}.`,
  units: (u) => `${u} units`,
  noResult: 'No result came back for this BOID.',
  error: 'Could not check the results.',
  retry: 'Try again',
};

export interface AllotmentCheckerProps {
  /** Issues to choose from (the registrar's list). Omit when the issue is fixed. */
  issues?: readonly SelectOption[];
  /** The issue chosen at first. Default the first. */
  defaultIssue?: string;
  /** Saved accounts, ticked by default. */
  savedAccounts?: readonly SavedBoid[];
  /** Runs the check. Resolve with one result per BOID; reject to show the error with a retry. */
  onCheck: (request: AllotmentRequest) => Promise<readonly AllotmentResult[]>;
  /** Most BOIDs in one check. Default 20. */
  maxBoids?: number;
  /** BOID prefix rule. Default '130'; null checks only the length. */
  prefix?: string | null;
  /** Digits for units. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Words for outcomes. */
  outcomeLabels?: Partial<Record<AllotmentOutcome, string>>;
  /** Replace the words. */
  labels?: Partial<AllotmentCheckerLabels>;
  /** Heading level of the results heading. Default 3. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
  /** Sets `data-testid` on the form; parts get `<id>-check`, `<id>-extra`, `<id>-result-<boid>`, ... */
  testId?: string;
}

interface Row { boid: string; name: string | null; result: AllotmentResult }

/** Pasted text to BOID candidates with their line numbers. */
function splitEntries(text: string): { line: number; value: string }[] {
  return text.split('\n').flatMap((lineText, i) => lineText.split(/[,;]/).map((v) => ({ line: i + 1, value: normalizeBoid(v) }))).filter((e) => e.value !== '');
}

export function AllotmentChecker({
  issues, defaultIssue, savedAccounts = [], onCheck, maxBoids = 20, prefix, digits = 'latn', outcomeLabels, labels, headingLevel = 3, className, testId,
}: AllotmentCheckerProps) {
  const words = { ...DEFAULT_ALLOTMENT_CHECKER_LABELS, ...labels };
  const uid = useId();
  const options: BoidOptions = { prefix };
  const [issue, setIssue] = useState<string>(defaultIssue ?? issues?.[0]?.value ?? '');
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set(savedAccounts.map((a) => normalizeBoid(a.boid))));
  const [extra, setExtra] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'error'>('idle');
  const [rows, setRows] = useState<Row[]>([]);
  const [lastRequest, setLastRequest] = useState<AllotmentRequest | null>(null);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const tid = (part: string) => (testId ? `${testId}-${part}` : undefined);
  const names = new Map(savedAccounts.map((a) => [normalizeBoid(a.boid), a.name]));

  const run = async (request: AllotmentRequest) => {
    setLastRequest(request);
    setState('checking');
    try {
      const results = await onCheck(request);
      const byBoid = new Map(results.map((r) => [normalizeBoid(r.boid), r]));
      setRows(request.boids.map((boid) => ({ boid, name: names.get(boid) ?? null, result: byBoid.get(boid) ?? { boid, outcome: 'error', message: words.noResult } })));
      setState('done');
    } catch {
      setState('error');
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (state === 'checking') return;
    const boids: string[] = savedAccounts.map((a) => normalizeBoid(a.boid)).filter((b) => ticked.has(b));
    const lineProblems: string[] = [];
    for (const entry of splitEntries(extra)) {
      const check = checkBoid(entry.value, options);
      if (!check.ok) lineProblems.push(words.lineError(entry.line, check.problem, check.digits));
      else boids.push(check.parts.boid);
    }
    const unique = [...new Set(boids)];
    const found = lineProblems.length ? lineProblems.join(' ') : unique.length === 0 ? words.none : unique.length > maxBoids ? words.tooMany(maxBoids) : null;
    setProblem(found);
    if (found) {
      if (lineProblems.length || unique.length > maxBoids) document.getElementById(`${uid}-extra`)?.focus();
      return;
    }
    void run({ issueId: issues ? issue : null, boids: unique });
  };

  const allotted = rows.filter((r) => r.result.outcome === 'allotted');
  const totalUnits = allotted.reduce((sum, r) => sum + (r.result.units ?? 0n), 0n);
  let results: ReactNode = null;
  if (state === 'error') {
    results = <RetryNote retryLabel={words.retry} onRetry={lastRequest ? () => void run(lastRequest) : undefined} testId={tid('error')}>{words.error}</RetryNote>;
  } else if (state === 'done') {
    results = (
      <section className="pu-allot-results" aria-labelledby={`${uid}-results`}>
        <Heading className="pu-allot-h" id={`${uid}-results`}>{words.results}</Heading>
        <ul className="pu-allot-rows">
          {rows.map((r) => (
            <li key={r.boid} className="pu-allot-row" data-outcome={r.result.outcome} data-testid={tid(`result-${r.boid}`)}>
              <span className="pu-allot-who">
                {r.name && <b>{r.name}</b>}
                <span className="pu-allot-boid">{formatBoid(r.boid)}</span>
                {r.result.message && <span className="pu-allot-msg">{r.result.message}</span>}
              </span>
              <span className="pu-allot-out">
                <StatusPill size="sm" tone={TONES[r.result.outcome]}>{outcomeLabels?.[r.result.outcome] ?? ALLOTMENT_OUTCOME_LABELS[r.result.outcome]}</StatusPill>
                {r.result.outcome === 'allotted' && r.result.units !== undefined && <span className="pu-allot-units">{words.units(formatUnits(r.result.units, digits))}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <form className={`pu-allot${className ? ` ${className}` : ''}`} onSubmit={onSubmit} noValidate data-testid={testId} aria-busy={state === 'checking' || undefined}>
      {issues && issues.length > 0 && (
        <Select label={words.issue} labelPlacement="above" size="lg" block value={issue} onChange={setIssue} options={issues} testId={tid('issue')} />
      )}
      {savedAccounts.length > 0 && (
        <fieldset className="pu-allot-saved">
          <legend>{words.saved}</legend>
          {savedAccounts.map((a) => {
            const boid = normalizeBoid(a.boid);
            return (
              <Checkbox
                key={boid}
                checked={ticked.has(boid)}
                onChange={(on) => {
                  const next = new Set(ticked);
                  if (on) next.add(boid); else next.delete(boid);
                  setTicked(next);
                }}
                end={<span className="pu-allot-boid">{formatBoid(boid)}</span>}
                testId={tid(`saved-${boid}`)}
              >
                {a.name}
              </Checkbox>
            );
          })}
        </fieldset>
      )}
      <TextAreaField
        id={`${uid}-extra`}
        label={words.extra}
        value={extra}
        onChange={(v) => { setExtra(v); if (problem) setProblem(null); }}
        hint={words.extraHint(maxBoids)}
        error={problem ?? undefined}
        rows={3}
        inputMode="numeric"
        spellCheck={false}
        autoComplete="off"
        testId={tid('extra')}
      />
      <div className="pu-allot-actions">
        <Button type="submit" loading={state === 'checking'} testId={tid('check')}>{words.check}</Button>
      </div>
      <p className="pu-allot-summary" role="status" data-testid={tid('summary')}>
        {state === 'done' ? words.summary(allotted.length, rows.length, formatUnits(totalUnits, digits)) : ''}
      </p>
      {results}
    </form>
  );
}
