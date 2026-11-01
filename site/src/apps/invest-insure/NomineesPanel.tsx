import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { Field } from '@punji/ui/fields';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import type { Nominee } from './data.ts';
import { useInvest } from './store.ts';

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'];

/** Nominees for each policy and for the fund folio: names, relationship and shares that must total 100%. */
export function NomineesPanel() {
  const { state, dispatch } = useInvest();
  const targets = [...state.policies.map((p) => ({ key: p.id, label: p.plan })), { key: 'folio', label: 'Mutual fund folio' }];
  const [key, setKey] = useState(targets[0]!.key);
  const [draft, setDraft] = useState<Nominee[]>(() => (state.nominees[targets[0]!.key] ?? []).map((n) => ({ ...n })));
  const [dirty, setDirty] = useState(false);
  const [tried, setTried] = useState(false);
  const [counter, setCounter] = useState(1);

  const choose = (k: string) => {
    setKey(k);
    setDraft((state.nominees[k] ?? []).map((n) => ({ ...n })));
    setDirty(false);
    setTried(false);
  };
  const edit = (id: string, patch: Partial<Nominee>) => {
    setDraft((d) => d.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    setDirty(true);
  };
  const total = draft.reduce((s, n) => s + (Number.isFinite(n.share) ? n.share : 0), 0);
  const rowErrors = draft.map((n) => ({ name: n.name.trim().length < 3 ? 'Enter the full name.' : undefined, share: !Number.isInteger(n.share) || n.share < 1 || n.share > 100 ? 'A whole percent from 1 to 100.' : undefined }));
  const totalError = draft.length > 0 && total !== 100 ? `Shares add up to ${total}%; they must total 100%.` : undefined;
  const save = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (totalError || rowErrors.some((e) => e.name || e.share)) return;
    dispatch({ type: 'nominees', key, nominees: draft.map((n) => ({ ...n, name: n.name.trim() })) });
    setDirty(false);
    setTried(false);
  };

  return (
    <div className="app-grid is-halves">
      <Card title="Nominees" description="Who receives the money if something happens to you" headingLevel={3} testId="ii-nominees">
        <form className="ii-form" noValidate onSubmit={save}>
          <Select label="For" labelPlacement="above" block value={key} onChange={choose} options={targets.map((t) => ({ value: t.key, label: t.label }))} testId="ii-nominee-for" />
          {draft.length === 0 ? (
            <Note tone="warn">No nominee. Without one, a claim waits for a succession certificate. Add at least one.</Note>
          ) : (
            <ol className="ii-nominees">
              {draft.map((n, i) => (
                <li key={n.id} className="ii-nominee">
                  <Field label={`Nominee ${i + 1}, full name`} value={n.name} onChange={(name) => edit(n.id, { name })} autoComplete="off" error={tried ? rowErrors[i]!.name : undefined} testId={`ii-nominee-name-${i}`} />
                  <div className="ii-form-row">
                    <Select label="Relationship" labelPlacement="above" block value={n.relation} onChange={(relation) => edit(n.id, { relation })} options={RELATIONS.map((r) => ({ value: r, label: r }))} />
                    <Field label="Share (%)" inputMode="numeric" value={Number.isFinite(n.share) ? String(n.share) : ''} onChange={(v) => edit(n.id, { share: /^\d{1,3}$/.test(v) ? Number(v) : Number.NaN })} error={tried ? rowErrors[i]!.share : undefined} testId={`ii-nominee-share-${i}`} />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setDraft((d) => d.filter((x) => x.id !== n.id)); setDirty(true); }} testId={`ii-nominee-remove-${i}`}>
                    Remove {n.name.trim() || `nominee ${i + 1}`}
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <p className="app-small" data-testid="ii-nominee-total" data-ok={total === 100 || undefined}>
            Total share: <strong>{total}%</strong> {total === 100 ? '(complete)' : 'of 100%'}
          </p>
          {tried && totalError && <Note tone="error">{totalError}</Note>}
          <div className="ii-buttons">
            <Button
              variant="secondary"
              disabled={draft.length >= 4}
              onClick={() => {
                setDraft((d) => [...d, { id: `new-${counter}`, name: '', relation: 'Spouse', share: Math.max(0, 100 - total) || 0 }]);
                setCounter((c) => c + 1);
                setDirty(true);
              }}
              testId="ii-nominee-add"
            >
              Add nominee
            </Button>
            <Button type="submit" disabled={!dirty} testId="ii-nominee-save">Save</Button>
          </div>
          {draft.length >= 4 && <p className="app-small app-muted">Up to four nominees.</p>}
        </form>
      </Card>
      <Card title="Saved nominees" headingLevel={3}>
        <ul className="ii-list">
          {targets.map((t) => (
            <li key={t.key} className="ii-row">
              <span className="ii-cell">
                <strong>{t.label}</strong>
                <span className="app-small app-muted">{(state.nominees[t.key] ?? []).length === 0 ? 'No nominee' : (state.nominees[t.key] ?? []).map((n) => `${n.name} (${n.relation}, ${n.share}%)`).join(', ')}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
