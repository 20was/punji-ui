// Amounts in words in the pack's language, exact from bigint minor units.
import { localAmountInWords } from '@punji/ui/locale';
import { hi } from '@punji/ui/locale/hi';

// "एक लाख तेईस हज़ार चार सौ छप्पन रुपये पचास पैसे मात्र"
export const words = localAmountInWords(12345650n, 'INR', hi.messages.amountWords!);
