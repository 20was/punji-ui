import { AllotmentChecker } from '@punji/ui/allotment-checker';
import { fakeAllotment, savedBoids, shareIssues } from '../../sample.ts';

// onCheck is your request (through your server) to the registrar's result service; here it is a local stand-in.
export default function Example() {
  return (
    <AllotmentChecker
      issues={shareIssues.filter((i) => i.kind === 'ipo').map((i) => ({ value: i.id, label: `${i.company}, ${i.shareGroup ?? 'ordinary shares'}` }))}
      savedAccounts={savedBoids}
      onCheck={async ({ boids }) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return fakeAllotment(boids);
      }}
    />
  );
}
