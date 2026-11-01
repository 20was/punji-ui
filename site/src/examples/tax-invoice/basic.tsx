import { TaxInvoice } from '@punji/ui/tax-invoice';

// A VAT invoice. Amounts are bigint paisa; the 5% discount, 13% VAT, total and amount in words are computed exactly.
// The seller, buyer and numbers are invented.
export default function Example() {
  return (
    <TaxInvoice
      seller={{ name: 'Himalayan Stationers Pvt. Ltd.', address: 'New Road, Kathmandu-22', contact: '01-4221234 · sales@example.com.np', pan: '301234567' }}
      buyer={{ name: 'Everest Accounting Services', address: 'Pulchowk, Lalitpur', pan: '609876543' }}
      invoiceNumber="INV-2082/83-0142"
      date={{ year: 2025, month: 10, day: 29 }}
      dueDate={{ year: 2025, month: 11, day: 28 }}
      paymentMode="Credit, 30 days"
      lines={[
        { id: 'l1', description: 'A4 copier paper, 80 gsm', detail: 'Box of 5 reams', quantity: 40n, unit: 'box', rate: 285_000n },
        { id: 'l2', description: 'Ledger books, 200 pages', quantity: 25n, unit: 'pcs', rate: 64_000n },
        { id: 'l3', description: 'Toner cartridge, 85A', quantity: 6n, unit: 'pcs', rate: 345_000n },
        { id: 'l4', description: 'Delivery within the valley', quantity: 1n, rate: 50_000n },
      ]}
      discount={{ rate: '0.05' }}
      notes="Goods once sold are not returned after 7 days. Bank: NIC Asia Bank, A/C 0123456789012."
      printable
    />
  );
}
