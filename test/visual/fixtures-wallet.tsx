import { useState, type ReactNode } from 'react';
import {
  AmountKeypad, MobileNumberInput, PaymentQrCard, PinPad, QrCode, buildMerchantQr, nepalMoneyConfig, nepalMoneyPreset,
} from '@punji/ui';

// Wallet and payment fixtures: QrCode, PaymentQrCard, AmountKeypad, PinPad and MobileNumberInput. All data is invented.
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8, alignContent: 'start' }}><h2 className="vr-h">{title}</h2>{children}</section>;
const grid = { display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'start' } as const;
const account = { id: '26', guid: 'np.com.example.pay', fields: { '01': 'M00012345' } };
const dynamicPayload = buildMerchantQr({ merchantAccounts: [account], merchantName: 'Himalayan Momo House', merchantCity: 'Kathmandu', amount: 125050n, additionalData: { billNumber: 'INV-0142' } });
const staticPayload = buildMerchantQr({ merchantAccounts: [account], merchantName: 'Sita Sharma', merchantCity: 'Lalitpur' });

function QrCodeFixture() {
  return <div style={grid}>
    <Block title="Level M, 160px"><QrCode value={dynamicPayload} label="QR code to pay Himalayan Momo House" size={160} testId="vr-qr" /></Block>
    <Block title="Level H, short text"><QrCode value="https://design.punji.app" errorCorrection="H" label="QR code linking to design.punji.app" size={160} /></Block>
  </div>;
}

function PaymentQrCardFixture() {
  return <div style={grid}>
    <Block title="Dynamic, with amount"><PaymentQrCard payload={dynamicPayload} qrSize={180} testId="vr-payqr" /></Block>
    <Block title="Static, Add amount"><PaymentQrCard payload={staticPayload} qrSize={180} labels={{ title: 'Receive money' }} onAmountChange={noop} footer="Scan with any NepalPay QR app" /></Block>
    <Block title="Nepali name"><PaymentQrCard payload={dynamicPayload} merchantName="हिमालयन मम हाउस" money={nepalMoneyConfig()} qrSize={180} /></Block>
    <Block title="Expired"><PaymentQrCard payload={dynamicPayload} state="expired" onRefresh={noop} qrSize={180} /></Block>
    <Block title="Damaged"><PaymentQrCard payload={`${dynamicPayload.slice(0, -4)}0000`} qrSize={180} /></Block>
    <Block title="Loading"><PaymentQrCard payload="" state="loading" qrSize={180} /></Block>
  </div>;
}

function KeypadCase({ initial, ...rest }: { initial: string; title: string; quick?: bigint[]; max?: bigint; error?: string; deva?: boolean }) {
  const [value, setValue] = useState(initial);
  return <Block title={rest.title}>
    <AmountKeypad
      label="Amount"
      preset={rest.deva ? nepalMoneyConfig({ language: 'ne', digits: 'deva' }) : nepalMoneyPreset}
      value={value}
      onValueChange={(c) => setValue(c.value)}
      quickAmounts={rest.quick}
      max={rest.max}
      error={rest.error}
      hint="Balance NPR 12,500.00"
    />
  </Block>;
}
function AmountKeypadFixture() {
  return <div style={grid}>
    <KeypadCase title="Empty" initial="" />
    <KeypadCase title="Lakh grouping, quick amounts" initial="125000.5" quick={[10000n, 50000n, 100000n, 2000000n]} max={1500000n} />
    <KeypadCase title="Error" initial="20000" error="This is more than your balance." />
    <KeypadCase title="Devanagari" initial="1250" deva />
  </div>;
}

function PinPadFixture() {
  return <div style={grid}>
    <Block title="Empty"><PinPad label="Enter your 4-digit PIN" testId="vr-pin" /></Block>
    <Block title="Two digits, hint"><PinPad label="Enter your 4-digit PIN" defaultValue="25" hint="To pay NPR 1,250.50" /></Block>
    <Block title="Error"><PinPad label="Enter your 4-digit PIN" error="Wrong PIN. 2 attempts left." /></Block>
    <Block title="Six digits, shuffled (fixed seed), Devanagari"><PinPad label="Enter your MPIN" length={6} defaultValue="123" shuffle random={() => 0} digits="deva" /></Block>
  </div>;
}

function MobileCase({ initial, ...rest }: { initial: string; label: string; digits?: 'latn' | 'deva'; error?: string; disabled?: boolean; hint?: string; testId?: string }) {
  const [value, setValue] = useState(initial);
  return <MobileNumberInput value={value} onValueChange={(r) => setValue(r.national)} {...rest} />;
}
function MobileNumberInputFixture() {
  return <div className="vr-grid">
    <MobileCase label="Mobile number (empty)" initial="" hint="NTC, Ncell or SmartCell" testId="vr-mobile" />
    <MobileCase label="Mobile number (Ncell)" initial="9801234567" />
    <MobileCase label="Mobile number (NTC, partial)" initial="98412" />
    <MobileCase label="Mobile number (SmartCell, Devanagari)" initial="9611234567" digits="deva" />
    <MobileCase label="Mobile number (error)" initial="9901234567" error="990 is not a Nepal mobile prefix. Check the number." />
    <MobileCase label="Mobile number (disabled)" initial="9851234567" disabled />
  </div>;
}

export const walletRegistry: Record<string, () => ReactNode> = {
  'qr-code': QrCodeFixture,
  'payment-qr-card': PaymentQrCardFixture,
  'amount-keypad': AmountKeypadFixture,
  'pin-pad': PinPadFixture,
  'mobile-number-input': MobileNumberInputFixture,
};
