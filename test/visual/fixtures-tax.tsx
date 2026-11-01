import { useState, type ReactNode } from 'react';
import {
  AgingTable, IncomeTaxCalculator, LineItemEditor, PanInput, Payslip, TaxInvoice, TdsSummary, type LineItemDraft, type TaxSlab,
} from '@punji/ui';

// Tax, invoicing and payroll fixtures. All names, numbers and rates are invented; the slabs are an example table.
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;
const LAKH = 10_000_000n;
const asOf = { year: 2025, month: 11, day: 15 };

function TaxInvoiceFixture() {
  return <Stack>
    <TaxInvoice
      testId="vr-inv"
      seller={{ name: 'Himalayan Stationers Pvt. Ltd.', address: 'New Road, Kathmandu-22', contact: '01-4221234', pan: '301234567' }}
      buyer={{ name: 'Everest Accounting Services', address: 'Pulchowk, Lalitpur', pan: '609876543' }}
      invoiceNumber="INV-2082/83-0142" date={{ year: 2025, month: 10, day: 29 }} dueDate={{ year: 2025, month: 11, day: 28 }} paymentMode="Credit, 30 days"
      lines={[
        { id: 'l1', description: 'A4 copier paper, 80 gsm', detail: 'Box of 5 reams', code: '4802.56', quantity: 40n, unit: 'box', rate: 285_000n },
        { id: 'l2', description: 'Ledger books, 200 pages', code: '4820.10', quantity: 25n, unit: 'pcs', rate: 64_000n, discount: 50_000n },
        { id: 'l3', description: 'Rice, exempt', code: '1006.30', quantity: '12.5', unit: 'kg', rate: 18_000n, taxable: false },
      ]}
      discount={{ rate: '0.05' }} copyMark="Copy of original (1)" notes="Goods once sold are not returned after 7 days." printable
    />
    <Block title="Invalid line">
      <TaxInvoice seller={{ name: 'Seller' }} buyer={{ name: 'Buyer' }} invoiceNumber="X-1" date={{ year: 2025, month: 10, day: 29 }} lines={[{ id: 'x', description: 'Bad', quantity: -1n, rate: 100n }]} signature={false} />
    </Block>
  </Stack>;
}

function LineItemEditorFixture() {
  const [lines, setLines] = useState<LineItemDraft[]>([
    { id: 'a', description: 'Consulting, October', quantity: '12', rate: '2500', taxable: true },
    { id: 'b', description: 'Printed manuals', quantity: '30', rate: '', taxable: true },
    { id: 'c', description: 'Rice for the canteen (kg)', quantity: '25.5', rate: '180', taxable: false },
  ]);
  return <LineItemEditor lines={lines} onChange={setLines} testId="vr-lie" />;
}

function PanCase({ label, initial, ...rest }: { label: string; initial: string; digits?: 'latn' | 'deva'; error?: string; disabled?: boolean; testId?: string }) {
  const [v, setV] = useState(initial);
  return <PanInput label={label} value={v} onValueChange={(c) => setV(c.value)} {...rest} />;
}
function PanInputFixture() {
  return <div className="vr-grid">
    <PanCase label="Buyer PAN (empty)" initial="" testId="vr-pan" />
    <PanCase label="Seller VAT number" initial="301234567" />
    <PanCase label="PAN (Devanagari)" initial="609876543" digits="deva" />
    <PanCase label="PAN (lookup error)" initial="123456789" error="No taxpayer found with this PAN." />
    <PanCase label="PAN (disabled)" initial="301234567" disabled />
  </div>;
}

const single: TaxSlab[] = [
  { width: 5n * LAKH, rate: '0.01', label: 'First 5 lakh (social security tax)', waivable: true }, { width: 2n * LAKH, rate: '0.1' }, { width: 3n * LAKH, rate: '0.2' },
  { width: 10n * LAKH, rate: '0.3' }, { width: 30n * LAKH, rate: '0.36' }, { width: null, rate: '0.39' },
];
const couple: TaxSlab[] = [
  { width: 6n * LAKH, rate: '0.01', label: 'First 6 lakh (social security tax)', waivable: true }, { width: 2n * LAKH, rate: '0.1' }, { width: 3n * LAKH, rate: '0.2' },
  { width: 9n * LAKH, rate: '0.3' }, { width: 30n * LAKH, rate: '0.36' }, { width: null, rate: '0.39' },
];
function IncomeTaxFixture() {
  return <IncomeTaxCalculator testId="vr-itax" fiscalYear="Example rates (FY 2081/82 shape)" slabs={{ single, couple }}
    retirementRule={{ cap: 5n * LAKH, fraction: { numerator: 1n, denominator: 3n } }}
    deductions={[{ id: 'life', label: 'Life insurance premium', cap: 4_000_000n }]}
    rebates={[{ id: 'women', label: 'Rebate for women (10%)', rate: '0.1' }]}
    defaultValues={{ income: '1500000', amounts: { cit: '150000', ssf: '60000' } }} />;
}

function PayslipFixture() {
  return <Payslip testId="vr-slip" period="Kartik 2082" payDate="1 Mangsir 2082 (17 Nov 2025)"
    employer={{ name: 'Himalayan Stationers Pvt. Ltd.', detail: 'New Road, Kathmandu', pan: '301234567' }}
    employee={{ name: 'Sita Gurung', detail: 'Employee EMP-014', pan: '123456789', facts: [{ label: 'Designation', value: 'Senior accountant' }, { label: 'Bank account', value: '•••• 4821' }] }}
    earnings={[{ id: 'basic', label: 'Basic salary', amount: 5_000_000n }, { id: 'allow', label: 'Allowance', amount: 1_000_000n }, { id: 'er', label: 'SSF, employer', detail: '20% of basic', amount: 1_000_000n }]}
    deductions={[{ id: 'ssf', label: 'SSF', detail: '31% of basic', amount: 1_550_000n }, { id: 'cit', label: 'CIT', amount: 500_000n }, { id: 'tds', label: 'Income tax (TDS)', amount: 238_750n }]}
    notes="Computer-generated payslip." printable />;
}

function AgingFixture() {
  const items = [
    { id: '1', party: 'Everest Stores', date: { year: 2025, month: 7, day: 20 }, amount: 4_250_000n },
    { id: '2', party: 'Everest Stores', date: { year: 2025, month: 10, day: 2 }, amount: 1_830_000n },
    { id: '3', party: 'Himal Traders', date: { year: 2025, month: 9, day: 10 }, amount: 2_640_000n },
    { id: '4', party: 'Himal Traders', date: { year: 2025, month: 11, day: 25 }, amount: 960_000n },
    { id: '5', party: 'Lumbini Mart', date: { year: 2025, month: 8, day: 28 }, amount: 3_115_000n },
  ];
  return <Stack>
    <AgingTable caption="Receivables aging, 15 Nov 2025 (NPR)" items={items} asOf={asOf} testId="vr-aging" />
    <Block title="Loading and empty">
      <AgingTable caption="Payables aging (NPR)" items={[]} asOf={asOf} state="loading" />
      <AgingTable caption="Payables aging (NPR)" items={[]} asOf={asOf} />
    </Block>
  </Stack>;
}

function TdsFixture() {
  const entries = [
    { id: 't1', party: 'Ram Shrestha', pan: '123456789', category: 'House rent', gross: 5_000_000n, rate: '0.1' },
    { id: 't2', party: 'Gita Tamang', pan: '123987654', category: 'House rent', gross: 3_500_000n, rate: '0.1' },
    { id: 't3', party: 'Sagarmatha Builders', pan: '301234567', category: 'Contract payment', gross: 42_000_000n, rate: '0.015' },
    { id: 't4', party: 'Bikash Rai', category: 'Service fee', gross: 1_500_000n, rate: '0.15' },
  ];
  return <Stack>
    <TdsSummary caption="TDS by category, Kartik 2082 (NPR)" entries={entries} testId="vr-tds" />
    <TdsSummary caption="TDS entries, Kartik 2082 (NPR)" entries={entries} view="entries" />
  </Stack>;
}

export const taxRegistry: Record<string, () => ReactNode> = {
  'tax-invoice': TaxInvoiceFixture, 'line-item-editor': LineItemEditorFixture, 'pan-input': PanInputFixture, 'income-tax-calculator': IncomeTaxFixture,
  payslip: PayslipFixture, 'aging-table': AgingFixture, 'tds-summary': TdsFixture,
};
