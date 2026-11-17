import { EarningsCalendar } from '@punji/ui/earnings-calendar';

// Some banks report before the market opens, some after it closes, some give an exact time. Figures are decimal strings.
export default function Example() {
  return (
    <EarningsCalendar
      caption="Quarterly results this week"
      timeZone="Asia/Kathmandu"
      events={[
        { id: 'nabil', when: '2026-11-12', session: 'before-open', symbol: 'NABIL', company: 'Nabil Bank', period: 'Q1 FY27', currency: 'NPR', epsActual: '4.38', epsForecast: '4.10', epsPrevious: '3.95', revenueActual: '12.4', revenueForecast: '12.9', revenueUnit: ' bn' },
        { id: 'nica', when: '2026-11-12T09:30:00Z', symbol: 'NICA', company: 'NIC Asia Bank', period: 'Q1 FY27', currency: 'NPR', epsActual: '3.10', epsForecast: '3.10', epsPrevious: '2.80', revenueActual: '9.6', revenueForecast: '9.4', revenueUnit: ' bn' },
        { id: 'hdl', when: '2026-11-16', session: 'after-close', symbol: 'HDL', company: 'Himalayan Distillery', period: 'Q1 FY27', currency: 'NPR', epsForecast: '12.00', epsPrevious: '11.20' },
        { id: 'ntc', when: '2026-11-16', symbol: 'NTC', company: 'Nepal Telecom', period: 'Q1 FY27', currency: 'NPR' },
      ]}
    />
  );
}
