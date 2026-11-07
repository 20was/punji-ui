import { EarningsCalendar } from '@punji/ui/earnings-calendar';

// Reporting days in BS first, with AD beside them; a projected BS month is marked.
export default function Example() {
  return (
    <EarningsCalendar
      caption="Results by Bikram Sambat date"
      timeZone="Asia/Kathmandu"
      calendar="bs"
      events={[
        { id: 'a', when: '2026-11-12', session: 'before-open', symbol: 'NABIL', company: 'Nabil Bank', period: 'Q1 FY27', currency: 'NPR', epsActual: '4.38', epsForecast: '4.10' },
        { id: 'b', when: '2027-04-30', session: 'after-close', symbol: 'NICA', company: 'NIC Asia Bank', period: 'Q3 FY27', currency: 'NPR', epsForecast: '3.60' },
      ]}
    />
  );
}
