import { KeyFacts, StepFlow, Timeline } from '@punji/ui/article';

// An ISO day prints in Bikram Sambat and Gregorian inside a <time>; any other text is shown as stated. The order is an
// ordered list and the tags say now or later in words. StepFlow's numbers are real list numbers; KeyFacts is a definition list.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: '70ch' }}>
      <Timeline
        label="IPO timetable"
        milestones={[
          { date: '2026-11-02', tag: 'Done', items: ['The issue opens for applications.'] },
          { date: '2026-11-09', tag: 'Next', items: ['The issue closes at 5 pm.', 'Applications after this are not accepted.'] },
          { date: 'About two weeks later', items: ['Allotment is announced.'] },
        ]}
      />
      <StepFlow
        label="How to apply"
        steps={[
          { title: 'Open your meroshare account', detail: 'Use the DP and login you set up with your broker.' },
          { title: 'Choose the issue', detail: 'Enter the units and your bank.' },
          { title: 'Confirm with your PIN' },
        ]}
      />
      <KeyFacts heading="The issue" facts={[{ label: 'Price per unit', value: 'NPR 100' }, { label: 'Minimum units', value: '10', note: 'Maximum 1,000' }, { label: 'Allotment', value: 'By lottery' }]} />
    </div>
  );
}
