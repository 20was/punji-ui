import { EconomicCalendar } from '@punji/ui/economic-calendar';

// Days in AD and BS from the library's own calendar. A BS month nobody has published yet carries the word "projected".
export default function Example() {
  return (
    <EconomicCalendar
      caption="Nepal releases"
      timeZone="Asia/Kathmandu"
      calendar="both"
      minImportance="medium"
      events={[
        { id: 'a', when: '2026-11-13T05:00:00Z', title: 'Monetary policy decision', country: 'Nepal', importance: 'high', actual: '5.50', forecast: '5.75', previous: '5.75', unit: '%', better: 'lower' },
        { id: 'b', when: '2027-04-30', title: 'Fiscal year budget review', country: 'Nepal', importance: 'medium' },
        { id: 'c', when: '2027-04-30T06:00:00Z', title: 'Remittance inflows, month on month', country: 'Nepal', importance: 'low', forecast: '1.2', unit: '%' },
      ]}
    />
  );
}
