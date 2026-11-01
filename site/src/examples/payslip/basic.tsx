import { Payslip } from '@punji/ui/payslip';

// The lines come from your payroll; the payslip sums them exactly and writes the net in words. Names are invented.
export default function Example() {
  return (
    <Payslip
      employer={{ name: 'Himalayan Stationers Pvt. Ltd.', detail: 'New Road, Kathmandu', pan: '301234567' }}
      employee={{
        name: 'Sita Gurung', detail: 'Employee EMP-014', pan: '123456789',
        facts: [{ label: 'Designation', value: 'Senior accountant' }, { label: 'SSF number', value: 'SSF-00412345' }, { label: 'Bank account', value: '•••• 4821' }],
      }}
      period="Kartik 2082"
      payDate="1 Mangsir 2082 (17 Nov 2025)"
      earnings={[
        { id: 'basic', label: 'Basic salary', amount: 5_000_000n },
        { id: 'grade', label: 'Grade', amount: 300_000n },
        { id: 'allow', label: 'Allowance', amount: 1_000_000n },
        { id: 'ssf-er', label: 'SSF, employer 20%', detail: '20% of basic', amount: 1_000_000n },
      ]}
      deductions={[
        { id: 'ssf', label: 'SSF', detail: '31% of basic (11% + 20%)', amount: 1_550_000n },
        { id: 'cit', label: 'CIT', amount: 500_000n },
        { id: 'tds', label: 'Income tax (TDS)', amount: 238_750n },
        { id: 'adv', label: 'Salary advance', amount: 200_000n },
      ]}
      notes="Computer-generated payslip. Questions: hr@example.com.np"
      printable
    />
  );
}
