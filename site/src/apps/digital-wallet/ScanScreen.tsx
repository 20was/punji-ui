import { useMemo, useState } from 'react';
import { AmountKeypad } from '@punji/ui/amount-keypad';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { buildMerchantQr, parseMerchantQr, type ParsedMerchantQr } from '@punji/ui/emvco-qr';
import { FactList } from '@punji/ui/fact-list';
import { TextAreaField } from '@punji/ui/fields';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PaymentQrCard } from '@punji/ui/payment-qr-card';
import { QrCode } from '@punji/ui/qr-code';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { PinConfirm, WalletReceipt, useStepFocus } from './confirm.tsx';
import { OWNER, WALLET_ID, cashbackFor, makePayment, npr, paymentProblem, rs, useWallet, type WalletTx } from './store.ts';

const account = (id: string) => [{ id: '26', guid: 'np.com.punjipay', fields: { '01': id } }];

/** Sample codes a camera might read: static and dynamic, with a bill number, a damaged one and a foreign one. */
const SAMPLES: { id: string; label: string; payload: string }[] = [
  { id: 'momo', label: 'Annapurna Momo House (you enter the amount)', payload: buildMerchantQr({ merchantAccounts: account('M100231'), merchantName: 'Annapurna Momo House', merchantCity: 'Lalitpur', merchantCategoryCode: '5812', additionalData: { terminalLabel: 'COUNTER1' } }) },
  { id: 'books', label: 'Thamel Books, Rs 1,250.00', payload: buildMerchantQr({ merchantAccounts: account('M100877'), merchantName: 'Thamel Books', merchantCity: 'Kathmandu', merchantCategoryCode: '5942', amount: 1_250_00n, pointOfInitiation: 'dynamic', additionalData: { billNumber: 'TB-20931' } }) },
  { id: 'pharmacy', label: 'Patan Pharmacy, Rs 486.50', payload: buildMerchantQr({ merchantAccounts: account('M101442'), merchantName: 'Patan Pharmacy', merchantCity: 'Lalitpur', merchantCategoryCode: '5912', amount: 486_50n, pointOfInitiation: 'dynamic', additionalData: { billNumber: 'PP-7781', storeLabel: 'Mangal Bazar' } }) },
  { id: 'damaged', label: 'A damaged code', payload: buildMerchantQr({ merchantAccounts: account('M100877'), merchantName: 'Thamel Books', merchantCity: 'Kathmandu', amount: 1_250_00n }).replace('Thamel', 'Thamal') },
  { id: 'inr', label: 'A code in Indian rupees', payload: buildMerchantQr({ merchantAccounts: account('M900001'), merchantName: 'Varanasi Silks', merchantCity: 'Varanasi', countryCode: 'IN', currency: 'INR', amount: 2_000_00n }) },
];
const MCC: Record<string, string> = { '5812': 'Restaurant', '5942': 'Bookshop', '5912': 'Pharmacy', '5411': 'Grocery' };

type Read = { ok: true; qr: ParsedMerchantQr } | { ok: false; message: string } | null;

function read(payload: string): Read {
  if (!payload.trim()) return null;
  const result = parseMerchantQr(payload.trim());
  if (!result.ok) return { ok: false, message: result.message };
  if (result.value.currency !== 'NPR') return { ok: false, message: `This code asks for payment in ${result.value.currency ?? 'another currency'}. The wallet pays merchants in Nepali rupees only.` };
  return { ok: true, qr: result.value };
}

function Pay() {
  const { state, dispatch } = useWallet();
  const [text, setText] = useState('');
  const [scanned, setScanned] = useState<Read>(null);
  const [amountText, setAmountText] = useState('');
  const [typed, setTyped] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'scan' | 'pin' | 'done'>('scan');
  const [done, setDone] = useState<WalletTx | null>(null);
  const ref = useStepFocus(step);
  const qr = scanned?.ok ? scanned.qr : null;
  const amount = qr?.amount ?? typed;

  const scan = (payload: string) => {
    setText(payload);
    setScanned(read(payload));
    setAmountText('');
    setTyped(null);
    setError(null);
  };
  const toPin = () => {
    const problem = paymentProblem(state, amount);
    if (problem) return setError(problem);
    setError(null);
    setStep('pin');
  };
  const reset = () => {
    setStep('scan');
    setText('');
    setScanned(null);
    setDone(null);
    setAmountText('');
    setTyped(null);
  };

  if (step === 'pin' && qr && amount !== null)
    return (
      <div ref={ref}>
        <PinConfirm
          title={`Pay ${qr.merchantName ?? 'merchant'}`}
          amount={amount}
          facts={[
            { label: 'Merchant', value: `${qr.merchantName}, ${qr.merchantCity}` },
            ...(qr.additionalData.billNumber ? [{ label: 'Bill', value: qr.additionalData.billNumber }] : []),
            { label: 'Fee', value: rs(0n) },
            { label: 'Cashback', value: rs(cashbackFor('qr', amount)) },
          ]}
          onCancel={() => setStep('scan')}
          onConfirmed={() => {
            const tx = makePayment(state, { kind: 'qr', title: qr.merchantName ?? 'Merchant', detail: `NepalPay QR · ${qr.merchantCity ?? ''}`, amount });
            dispatch({ type: 'pay', tx });
            setDone(tx);
            setStep('done');
          }}
        />
      </div>
    );
  if (step === 'done' && done)
    return (
      <div ref={ref}>
        <Card title="Paid" headingLevel={3}>
          <WalletReceipt tx={done} actions={<Button onClick={reset}>Scan another</Button>} />
        </Card>
      </div>
    );

  return (
    <div ref={ref} className="app-grid is-halves">
      <Card title="Scan a code" description="This demo has no camera: pick a sample or paste the text a QR code holds." headingLevel={3}>
        <div className="app-stack">
          <ul className="dw-samples" aria-label="Sample codes">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <button type="button" className="dw-sample" onClick={() => scan(s.payload)} aria-pressed={text === s.payload} data-testid={`dw-sample-${s.id}`}>
                  <span className="dw-sample-qr" aria-hidden="true">
                    <QrCode value={s.payload} size={40} margin={1} label={s.label} />
                  </span>
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <TextAreaField label="Or paste a QR payload" value={text} onChange={(v) => scan(v)} rows={3} hint="An EMVCo merchant payload, starting 000201" testId="dw-payload" />
        </div>
      </Card>
      <Card title="Who you are paying" headingLevel={3} testId="dw-merchant">
        {scanned === null ? (
          <p className="app-muted">Scan a code to see the merchant and the amount it carries before you pay.</p>
        ) : !scanned.ok ? (
          <Note tone="error">
            <span data-testid="dw-qr-error">{scanned.message}</span>
          </Note>
        ) : (
          <div className="app-stack">
            <FactList
              facts={[
                { label: 'Merchant', value: <strong>{scanned.qr.merchantName}</strong> },
                { label: 'City', value: scanned.qr.merchantCity ?? '—' },
                ...(scanned.qr.merchantCategoryCode && MCC[scanned.qr.merchantCategoryCode] ? [{ label: 'Type', value: MCC[scanned.qr.merchantCategoryCode] }] : []),
                ...(scanned.qr.additionalData.billNumber ? [{ label: 'Bill number', value: scanned.qr.additionalData.billNumber }] : []),
                ...(scanned.qr.additionalData.terminalLabel ? [{ label: 'Counter', value: scanned.qr.additionalData.terminalLabel }] : []),
                { label: 'Code', value: scanned.qr.pointOfInitiation === 'dynamic' ? 'One-time (amount set by the merchant)' : 'Shop code (you enter the amount)' },
              ]}
            />
            {scanned.qr.amount !== null ? (
              <p className="dw-confirm-amount">
                <MoneyDisplay value={scanned.qr.amount} preset={npr} testId="dw-qr-amount" />
              </p>
            ) : (
              <AmountKeypad
                label="Amount"
                preset={npr}
                value={amountText}
                onValueChange={(c) => {
                  setAmountText(c.value);
                  setTyped(c.minorUnits);
                  setError(null);
                }}
                quickAmounts={[100_00n, 250_00n, 500_00n, 1_000_00n]}
                max={state.balance}
                hint={state.hideBalance ? undefined : `Balance ${rs(state.balance)}`}
                testId="dw-qr-keypad"
              />
            )}
            {error && <Note tone="error">{error}</Note>}
            <Button size="lg" block onClick={toPin} disabled={amount === null || amount <= 0n || state.locked} testId="dw-qr-pay">
              {amount ? `Pay ${rs(amount)}` : 'Pay'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Receive() {
  const [amount, setAmount] = useState<bigint | null>(null);
  const payload = useMemo(() => buildMerchantQr({ merchantAccounts: [{ id: '26', guid: 'np.com.punjipay', fields: { '01': WALLET_ID } }], merchantName: OWNER, merchantCity: 'Lalitpur', amount, pointOfInitiation: amount ? 'dynamic' : 'static' }), [amount]);
  return (
    <div className="dw-receive">
      <PaymentQrCard payload={payload} labels={{ title: 'Receive money' }} onAmountChange={setAmount} footer="Anyone with a NepalPay QR app can scan it." headingLevel={3} testId="dw-myqr" />
    </div>
  );
}

/** Scan a merchant's QR (simulated by pasting or picking a sample) and pay with the PIN, or show your own code. */
export default function ScanScreen() {
  const [tab, setTab] = useState<'pay' | 'receive'>('pay');
  return (
    <div className="app-stack">
      <ScreenTitle>Scan and pay</ScreenTitle>
      <SegmentedControl
        options={[
          { value: 'pay', label: 'Pay a merchant' },
          { value: 'receive', label: 'My QR' },
        ]}
        value={tab}
        onChange={setTab}
        prefix="dw-scan"
        label="Scan"
        panelId="dw-scan-panel"
        fill
      />
      <div id="dw-scan-panel" role="tabpanel" aria-labelledby={`dw-scan-${tab}`}>
        {tab === 'pay' ? <Pay /> : <Receive />}
      </div>
    </div>
  );
}
