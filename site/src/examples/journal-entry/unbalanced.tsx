import { JournalEntryView } from '@punji/ui/journal-entry';
import { unbalancedJournal } from '../../sample.ts';

// Five rupees short on the credit side. The view says so in words; it does not correct or reject the entry.
export default function Example() {
  return <JournalEntryView journal={unbalancedJournal} headingLevel={3} />;
}
