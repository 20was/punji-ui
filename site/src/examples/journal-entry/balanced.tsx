import { JournalEntryView } from '@punji/ui/journal-entry';
import { saleJournal } from '../../sample.ts';

export default function Example() {
  return <JournalEntryView journal={saleJournal} />;
}
