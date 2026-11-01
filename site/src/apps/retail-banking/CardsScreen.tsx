import { useState, type FormEvent } from 'react';
import { AccountNumber } from '@punji/ui/account-number';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { InlineConfirm } from '@punji/ui/inline-confirm';
import { MeterBar } from '@punji/ui/meter';
import { Note } from '@punji/ui/states';
import { StatusPill } from '@punji/ui/status-pill';
import { Switch } from '@punji/ui/switch';
import { ScreenTitle } from '../shared/kit.tsx';
import { HOLDER, accountById, npr, rs, useBank, type BankCard, type CardLimits } from './store.ts';

const CHANNELS: { key: keyof CardLimits; label: string }[] = [
  { key: 'atm', label: 'ATM withdrawals' },
  { key: 'pos', label: 'Shops (POS)' },
  { key: 'online', label: 'Online' },
];
const toText = (paisa: bigint) => `${paisa / 100n}`;

/** One card: the card face, freeze and block, channel switches and daily limits. */
function CardPanel({ card }: { card: BankCard }) {
  const { state, dispatch } = useBank();
  const [confirm, setConfirm] = useState<'unfreeze' | 'block' | null>(null);
  const [texts, setTexts] = useState<Record<keyof CardLimits, string>>({ atm: toText(card.limits.atm), pos: toText(card.limits.pos), online: toText(card.limits.online) });
  const [values, setValues] = useState<CardLimits>(card.limits);
  const [errors, setErrors] = useState<Partial<Record<keyof CardLimits, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const channels = CHANNELS.filter((c) => card.maxLimits[c.key] > 0n);
  const blocked = card.status === 'blocked';
  const frozen = card.status === 'frozen';
  const tail = card.number.slice(-4);

  const guard = (run: () => void) => {
    if (state.offline) {
      setProblem('You are offline, so the card could not be changed. Try again when you are back online.');
      return;
    }
    setProblem(null);
    run();
  };
  const saveLimits = (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<keyof CardLimits, string>> = {};
    for (const c of channels) {
      const v = values[c.key];
      if (v < 0n) next[c.key] = 'Enter an amount.';
      else if (v > card.maxLimits[c.key]) next[c.key] = `The most the bank allows is ${rs(card.maxLimits[c.key])}.`;
    }
    setErrors(next);
    if (Object.keys(next).length === 0) guard(() => dispatch({ type: 'card-limits', cardId: card.id, limits: values }));
  };

  return (
    <Card
      title={card.name}
      description={`Linked to ${accountById(card.account).name}`}
      headingLevel={3}
      action={<StatusPill size="sm" tone={blocked ? 'loss' : frozen ? 'warn' : 'gain'}>{blocked ? 'Blocked' : frozen ? 'Frozen' : 'Active'}</StatusPill>}
      testId={`rb-card-${card.id}`}
    >
      <div className="app-stack">
        <div className="rb-cardface" data-status={card.status} aria-label={`${card.network} card ending ${tail}`} role="img">
          <span className="rb-cardface-bank" aria-hidden="true">Punji Bank</span>
          <span className="rb-cardface-chip" aria-hidden="true" />
          <span className="rb-cardface-number" aria-hidden="true">•••• •••• •••• {tail}</span>
          <span className="rb-cardface-foot" aria-hidden="true">
            <span>{HOLDER.toUpperCase()}</span>
            <span>{card.expiry}</span>
            <span className="rb-cardface-network">{card.network}</span>
          </span>
        </div>
        <dl className="rb-facts">
          <div>
            <dt>Card number</dt>
            <dd>
              <AccountNumber value={card.number} label="Card number" revealable={!blocked} autoHideMs={10000} testId={`rb-card-${card.id}-number`} />
            </dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{card.expiry}</dd>
          </div>
          <div>
            <dt>CVV</dt>
            <dd className="app-muted">Never shown in the app</dd>
          </div>
        </dl>
        {problem && <Note tone="error">{problem}</Note>}

        {blocked ? (
          <div className="app-stack">
            <Note tone="warn">This card is blocked for good. A replacement has a new number and costs {rs(500_00n)}, taken from {accountById(card.account).name}.</Note>
            <div>
              <Button onClick={() => guard(() => dispatch({ type: 'card-replace', cardId: card.id }))} testId={`rb-card-${card.id}-replace`}>
                Order a replacement ({rs(500_00n)})
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rb-card-row">
              <Switch
                label={frozen ? 'Card frozen' : 'Freeze card'}
                checked={frozen}
                onChange={(next) => {
                  if (next) guard(() => dispatch({ type: 'card-status', cardId: card.id, status: 'frozen' }));
                  else setConfirm('unfreeze');
                }}
                testId={`rb-card-${card.id}-freeze`}
              />
              <span className="app-muted app-small">{frozen ? 'Payments and withdrawals are declined.' : 'Freeze it at once if you cannot find it.'}</span>
            </div>
            {confirm === 'unfreeze' && (
              <InlineConfirm
                title="Unfreeze this card?"
                body="Payments and withdrawals will work again straight away."
                confirm="Unfreeze"
                cancel="Keep frozen"
                onConfirm={() => {
                  setConfirm(null);
                  guard(() => dispatch({ type: 'card-status', cardId: card.id, status: 'active' }));
                }}
                onCancel={() => setConfirm(null)}
                confirmTestId={`rb-card-${card.id}-unfreeze`}
              />
            )}
            <fieldset className="rb-fieldset">
              <legend>Where the card works</legend>
              <div className="rb-switch-list">
                <Switch label="Online payments" checked={card.online} onChange={(v) => guard(() => dispatch({ type: 'card-toggle', cardId: card.id, key: 'online', value: v }))} disabled={frozen} />
                <Switch label="International use" checked={card.international} onChange={(v) => guard(() => dispatch({ type: 'card-toggle', cardId: card.id, key: 'international', value: v }))} disabled={frozen} />
                {card.maxLimits.pos > 0n && <Switch label="Contactless" checked={card.contactless} onChange={(v) => guard(() => dispatch({ type: 'card-toggle', cardId: card.id, key: 'contactless', value: v }))} disabled={frozen} />}
              </div>
            </fieldset>
            <form className="rb-limits" onSubmit={saveLimits} noValidate>
              <h4 className="rb-subhead">Daily limits</h4>
              {channels.map((c) => {
                const spent = card.spentToday[c.key];
                const limit = card.limits[c.key];
                return (
                  <div key={c.key} className="rb-limit">
                    <CurrencyInput
                      label={c.label}
                      preset={npr}
                      size="md"
                      value={texts[c.key]}
                      onValueChange={(change) => {
                        setTexts((t) => ({ ...t, [c.key]: change.value }));
                        setValues((v) => ({ ...v, [c.key]: change.minorUnits ?? -1n }));
                      }}
                      hint={`Up to ${rs(card.maxLimits[c.key])}. Used today: ${rs(spent)}.`}
                      error={errors[c.key]}
                      testId={`rb-card-${card.id}-limit-${c.key}`}
                    />
                    <MeterBar parts={[{ value: Number(spent > limit ? limit : spent), tone: 'chart' }]} max={Number(limit > 0n ? limit : 1n)} />
                  </div>
                );
              })}
              <div>
                <Button type="submit" variant="secondary" disabled={frozen} testId={`rb-card-${card.id}-save`}>
                  Save limits
                </Button>
              </div>
            </form>
            {confirm === 'block' ? (
              <InlineConfirm
                title="Block this card for good?"
                body="Use this if the card is lost or stolen. It cannot be undone; you can order a replacement with a new number."
                confirm="Block card"
                cancel="Cancel"
                role="alertdialog"
                onConfirm={() => {
                  setConfirm(null);
                  guard(() => dispatch({ type: 'card-status', cardId: card.id, status: 'blocked' }));
                }}
                onCancel={() => setConfirm(null)}
                confirmTestId={`rb-card-${card.id}-block-confirm`}
              />
            ) : (
              <div>
                <Button variant="danger" size="sm" onClick={() => setConfirm('block')} testId={`rb-card-${card.id}-block`}>
                  Report lost or stolen
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/** Debit and virtual cards: freeze, block and replace, where each works, and daily limits. */
export default function CardsScreen() {
  const { state } = useBank();
  return (
    <div className="app-stack">
      <ScreenTitle>Cards</ScreenTitle>
      <div className="app-grid is-halves">
        {state.cards.map((card) => (
          <CardPanel key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
