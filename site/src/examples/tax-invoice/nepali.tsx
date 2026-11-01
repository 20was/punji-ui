import { TaxInvoice } from '@punji/ui/tax-invoice';

// Exempt and taxable lines on one bill, a weight in kilograms, the BS date in Nepali with Devanagari digits, the
// amount in words in Nepali, and a copy mark for a reprint. Labels are translated through `labels`.
export default function Example() {
  return (
    <TaxInvoice
      seller={{ name: 'Annapurna Kirana Pasal', address: 'Lakeside, Pokhara', pan: '612345678' }}
      buyer={{ name: 'Fewa Guest House', pan: '६०१२३४५६७' }}
      invoiceNumber="2082-0098"
      date={{ year: 2025, month: 11, day: 3 }}
      paymentMode="नगद"
      language="ne"
      digits="deva"
      copyMark="प्रतिलिपि (१)"
      words={{ language: 'ne' }}
      currencyNote="रकम नेपाली रुपैयाँमा"
      labels={{
        title: 'कर बीजक', invoiceNumber: 'बीजक नं.', date: 'मिति', buyer: 'खरिदकर्ता', pan: 'स्थायी लेखा नं.', serial: 'क्र.सं.', description: 'विवरण', quantity: 'परिमाण',
        rate: 'दर', amount: 'रकम', subtotal: 'जम्मा', taxable: 'करयोग्य रकम', exempt: 'कर छुट रकम', vat: 'मू.अ.कर', total: 'कुल जम्मा', inWords: 'अक्षरमा',
        exemptMark: 'कर छुट', signature: 'अधिकृत दस्तखत', paymentMode: 'भुक्तानी', dateBS: 'वि.सं.', dateAD: 'ई.सं.', lines: 'सामान',
      }}
      lines={[
        { id: 'rice', description: 'Basmati rice', quantity: '12.5', unit: 'kg', rate: 18_000n, taxable: false },
        { id: 'oil', description: 'Sunflower oil, 1 litre', quantity: 6n, unit: 'pcs', rate: 32_500n },
        { id: 'soap', description: 'Laundry soap', quantity: 10n, unit: 'pcs', rate: 6_000n },
      ]}
    />
  );
}
