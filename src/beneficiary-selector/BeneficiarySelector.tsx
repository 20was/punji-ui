'use client';

/**
 * BeneficiarySelector: pick a saved payee from a searchable list, with
 * favourites first, then recent, then the rest. It is a combobox with a
 * listbox (type to filter, arrow keys to move, Enter to choose, Escape to
 * close). Account numbers are always masked to the last digits and the full
 * number is never rendered. It only chooses: it submits nothing and validates
 * nothing about the payee; confirm the payee and every limit on the server.
 * The list is filtered in memory by name, nickname and institution, so pass
 * the saved payees (tens, not tens of thousands).
 */
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { accountNumberTail, maskAccountNumber, spokenAccountNumber } from '../banking/account.ts';
import { Skeleton } from '../states/States.tsx';

export interface Beneficiary {
  /** Stable unique id (what `onChange` receives). */
  id: string;
  /** The payee's name as saved. */
  name: string;
  /** A short name the payer gave ("Mother", "Rent"). Searched, and shown after the name. */
  nickname?: string;
  /** The bank or wallet ("Nabil Bank", "Khalti"). */
  institution?: string;
  /** Full account number; shown masked. */
  accountNumber: string;
  /** Pinned in the first group. */
  favourite?: boolean;
  /** Paid recently; in the second group when not a favourite. */
  recent?: boolean;
}

export interface BeneficiarySelectorLabels {
  favourites: string; recent: string; others: string; none: string; loading: string; favourite: string; endingIn: string; placeholder: string;
}

export const DEFAULT_BENEFICIARY_SELECTOR_LABELS: BeneficiarySelectorLabels = {
  favourites: 'Favourites', recent: 'Recent', others: 'All payees', none: 'No payee matches', loading: 'Loading payees', favourite: 'Favourite', endingIn: 'account ending in', placeholder: 'Search payees',
};

export interface BeneficiarySelectorProps {
  /** The saved payees. */
  beneficiaries: readonly Beneficiary[];
  /** The chosen payee's id, or null for none. */
  value: string | null;
  /** Called with the chosen payee's id. Nothing is submitted. */
  onChange: (id: string) => void;
  /** The visible label and the field's name ("Pay to"). */
  label: string;
  /** Trailing characters of the account number shown. Default 4. */
  visible?: number;
  /** The payees are not here yet. */
  loading?: boolean;
  /** What is wrong, under the field (a server error, a required choice). */
  error?: string;
  /** Replace the words, in the reader's language. */
  labels?: Partial<BeneficiarySelectorLabels>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the input; options get `<id>-option-<beneficiaryId>`. */
  testId?: string;
}

const norm = (s: string) => s.normalize('NFKD').toLocaleLowerCase();

export function BeneficiarySelector({ beneficiaries, value, onChange, label, visible = 4, loading, error, labels, className, testId }: BeneficiarySelectorProps) {
  const words = { ...DEFAULT_BENEFICIARY_SELECTOR_LABELS, ...labels };
  const uid = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const selected = beneficiaries.find((b) => b.id === value);

  const groups = useMemo(() => {
    const q = norm(query.trim());
    const hits = beneficiaries.filter((b) => !q || norm(`${b.name} ${b.nickname ?? ''} ${b.institution ?? ''}`).includes(q));
    return [
      { key: 'favourites', title: words.favourites, items: hits.filter((b) => b.favourite) },
      { key: 'recent', title: words.recent, items: hits.filter((b) => !b.favourite && b.recent) },
      { key: 'others', title: words.others, items: hits.filter((b) => !b.favourite && !b.recent) },
    ].filter((g) => g.items.length > 0);
  }, [beneficiaries, query, words.favourites, words.recent, words.others]);
  const flat = groups.flatMap((g) => g.items);
  const active = flat.length ? Math.min(index, flat.length - 1) : -1;
  const optionId = (id: string) => `${uid}-opt-${id}`;
  const listId = `${uid}-list`;

  const choose = (b: Beneficiary) => {
    onChange(b.id);
    setOpen(false);
    setQuery('');
    setIndex(0);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (flat.length) setIndex((active + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length);
    } else if (e.key === 'Home' && open && flat.length) { e.preventDefault(); setIndex(0); }
    else if (e.key === 'End' && open && flat.length) { e.preventDefault(); setIndex(flat.length - 1); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (active >= 0) choose(flat[active]!); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); setQuery(''); setIndex(0); }
  };

  const tailOf = (b: Beneficiary) => spokenAccountNumber(accountNumberTail(b.accountNumber, visible), 0);
  const cls = `pu-bene${error ? ' bad' : ''}${className ? ` ${className}` : ''}`;
  return (
    <div className={cls}>
      <label className="pu-bene-label" htmlFor={`${uid}-in`}>{label}</label>
      <div className="pu-bene-box">
      <input
        id={`${uid}-in`}
        ref={input}
        className="pu-bene-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={open && !loading ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(flat[active]!.id) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${uid}-err` : selected ? `${uid}-sel` : undefined}
        aria-busy={loading || undefined}
        placeholder={words.placeholder}
        autoComplete="off"
        spellCheck={false}
        value={open ? query : (selected?.name ?? '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setIndex(0); }}
        onFocus={(e) => { if (!loading) { setOpen(true); e.currentTarget.select(); } }}
        onBlur={() => { setOpen(false); setQuery(''); setIndex(0); }}
        onKeyDown={onKeyDown}
        data-testid={testId}
      />
      {open && loading && <div className="pu-bene-pop" aria-busy="true"><Skeleton width="60%" height={16} label={words.loading} /><Skeleton width="45%" height={16} /></div>}
      {open && !loading && flat.length === 0 && <p className="pu-bene-pop pu-bene-none" role="status">{words.none}</p>}
      {open && !loading && flat.length > 0 && (
        <div className="pu-bene-pop" id={listId} role="listbox" aria-label={label}>
          {groups.map((g) => (
            <div key={g.key} role="group" aria-labelledby={`${uid}-g-${g.key}`}>
              <div className="pu-bene-group" id={`${uid}-g-${g.key}`}>{g.title}</div>
              {g.items.map((b) => (
                // Focus stays in the input (aria-activedescendant); the keyboard is handled there.
                // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                <div
                  key={b.id}
                  id={optionId(b.id)}
                  role="option"
                  aria-selected={b.id === value}
                  className={`pu-bene-opt${b === flat[active] ? ' on' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(b)}
                  data-testid={testId ? `${testId}-option-${b.id}` : undefined}
                >
                  <span className="pu-bene-name">
                    {b.name}
                    {b.nickname && <span className="pu-bene-nick"> ({b.nickname})</span>}
                    {b.favourite && <span className="kit-sr"> {words.favourite}</span>}
                  </span>
                  <span className="pu-bene-meta">
                    {b.institution && <span>{b.institution}</span>}
                    <span aria-hidden="true">{maskAccountNumber(b.accountNumber, { visible, groupSize: 4 })}</span>
                    <span className="kit-sr">{words.endingIn} {tailOf(b)}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      </div>
      {error && <span className="pu-bene-err" id={`${uid}-err`} role="alert">{error}</span>}
      {selected && !open && (
        <span className="pu-bene-sel" id={`${uid}-sel`}>
          {selected.institution && <span>{selected.institution}</span>}
          <span aria-hidden="true">{maskAccountNumber(selected.accountNumber, { visible, groupSize: 4 })}</span>
          <span className="kit-sr">{words.endingIn} {tailOf(selected)}</span>
        </span>
      )}
    </div>
  );
}
