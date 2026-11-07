import { EconomicCalendar } from '@punji/ui/economic-calendar';

// Times are ISO instants; the calendar shows them in the zone you name, never the reader's. Figures are decimal strings.
export default function Example() {
  return (
    <EconomicCalendar
      caption="Macro releases this week"
      timeZone="Asia/Kathmandu"
      events={[
        { id: 'cpi', when: '2026-11-12T13:30:00Z', title: 'Consumer price index, year on year', country: 'US', period: 'Oct', importance: 'high', actual: '3.2', forecast: '3.0', previous: '2.9', unit: '%' },
        { id: 'jobless', when: '2026-11-12T13:30:00Z', title: 'Initial jobless claims', country: 'US', importance: 'medium', actual: '231', forecast: '225', previous: '227', unit: ' K', better: 'lower' },
        { id: 'nrb', when: '2026-11-13T05:00:00Z', title: 'Policy rate decision', country: 'Nepal', importance: 'high', forecast: '5.50', previous: '5.50', unit: '%' },
        { id: 'retail', when: '2026-11-13T13:30:00Z', title: 'Retail sales, month on month', country: 'US', period: 'Oct', importance: 'low', actual: '0.4', forecast: '0.4', previous: '0.1', unit: '%' },
      ]}
    />
  );
}
