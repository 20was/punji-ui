/**
 * The typed message catalogue for component copy. Every namespace is optional and every key in it is optional:
 * anything a pack leaves out falls back to the component's English default, and a component's own `labels` prop
 * always wins over the pack. Types only: the packs (`@punji/ui/locale/ne`, `/hi`, `/bn`) are plain data.
 */
import type { CalendarLabels } from '../calendar/labels.ts';
import type { HoldToConfirmLabels } from '../hold-to-confirm/HoldToConfirm.tsx';
import type { IdNumberInputLabels } from '../id-number-input/IdNumberInput.tsx';
import type { PanInputLabels } from '../pan-input/PanInput.tsx';
import type { PayeeVerificationLabels } from '../payee-verification/PayeeVerification.tsx';
import type { PaymentFieldKind, PaymentFieldMessages } from '../payment-fields/messages.ts';
import type { ScamScenario, ScamWarningCopy, ScamWarningLabels } from '../scam-warning/ScamWarning.tsx';
import type { SecureFieldLabels } from '../secure-field/SecureField.tsx';
import type { SessionTimeoutLabels } from '../session-timeout/SessionTimeoutWarning.tsx';
import type { TransferReviewLabels } from '../transfer-review/TransferReview.tsx';
import type { SpoofIssueKind } from '../trust/spoofing.ts';

/** Pagination's words (the `Pagination` component's label props). */
export interface PaginationMessages {
  /** Previous button. Default "Previous page". */
  previous?: string;
  /** Next button. Default "Next page". */
  next?: string;
  /** A page button's name. Default "Page n". */
  page?: (page: number) => string;
  /** The range line. Default "6–10 of 12". */
  range?: (range: string, total: string) => string;
}

/** DataTable's built-in words: empty and loading states, search, selection and page controls. */
export interface TableMessages {
  /** Empty table. Default "No records to display." */
  empty?: string;
  /** While loading. Default "Loading records…". */
  loading?: string;
  /** Clear-search button. Default "Clear search". */
  clearSearch?: string;
  /** Select-page checkbox. Default "Select all rows on this page". */
  selectPage?: string;
  /** Clear-selection button. Default "Clear selection". */
  clearSelection?: string;
  /** Selected count. Default "3 selected". */
  selected?: (count: number) => string;
  /** Previous button text. Default "Previous". */
  previous?: string;
  /** Next button text. Default "Next". */
  next?: string;
  /** Previous button's name. Default "Previous page". */
  previousPage?: string;
  /** Next button's name. Default "Next page". */
  nextPage?: string;
  /** Current page. Default "Page 2 of 5". */
  page?: (page: number, pageCount: number) => string;
  /** With no rows. Default "No pages". */
  noPages?: string;
  /** Range line. Default "11–20 of 45". */
  range?: (start: number, end: number, rowCount: number) => string;
  /** Range line with no rows. Default "0 results". */
  noResults?: string;
  /** The page controls' name from the table caption. Default "{caption} pages". */
  pages?: (caption: string) => string;
}

/** Spoofing issue sentences by kind, replacing `detectSpoofing`'s English messages where a component shows them. */
export type SpoofingMessages = Partial<Record<Exclude<SpoofIssueKind, 'lookalike'>, string>> & {
  /** For a name that imitates a trusted one. */
  lookalike?: (trustedName: string) => string;
};

/**
 * Amount-in-words data for one language, read by `localAmountInWords` and by `ConfirmAmount`: the South Asian
 * system (hundred, thousand, lakh, crore, arab, kharab) with the language's own words for 0 to 99.
 */
export interface AmountWordsPack {
  /** Words for 0 to 99, index = number (100 entries). */
  numbers: readonly string[];
  /** Scale words, largest first: kharab, arab, crore, lakh, thousand, hundred. */
  scales: readonly [string, string, string, string, string, string];
  /** Major and minor unit names by ISO 4217 code ({ NPR: ['रुपैयाँ', 'पैसा'] }). Other currencies print the code. */
  currencies: Readonly<Record<string, readonly [string, string]>>;
  /** Word after the amount ("only"). '' for none. */
  suffix: string;
  /** Word before a negative amount. */
  minus: string;
}

/** Every component namespace a pack can fill. */
export interface PunjiMessages {
  transferReview?: TransferReviewLabels;
  confirmAmount?: { label?: string; inWords?: string; changedFrom?: string };
  payeeVerification?: PayeeVerificationLabels;
  holdToConfirm?: HoldToConfirmLabels;
  sessionTimeout?: SessionTimeoutLabels;
  scamWarning?: ScamWarningLabels & { scenarios?: Partial<Record<ScamScenario, ScamWarningCopy>> };
  secureField?: SecureFieldLabels;
  spoofing?: SpoofingMessages;
  pagination?: PaginationMessages;
  table?: TableMessages;
  calendar?: Partial<CalendarLabels>;
  idNumberInput?: Partial<IdNumberInputLabels>;
  panInput?: Partial<PanInputLabels>;
  paymentFields?: { messages?: Partial<PaymentFieldMessages>; fieldNames?: Partial<Record<PaymentFieldKind, string>> };
  amountWords?: AmountWordsPack;
}

/** One language's pack. */
export interface PunjiLocalePack {
  /** BCP 47 tag ('ne', 'hi', 'bn'). Used for Intl names (countries) and `lang` attributes you set. */
  locale: string;
  /** The language's own name ('नेपाली'). */
  name: string;
  /**
   * Who checked the text. 'machine-drafted': written without a native-speaker review; have it reviewed before you
   * ship it to customers. No pack in this package claims a native review.
   */
  review: 'machine-drafted' | 'native-reviewed';
  /** The messages. */
  messages: PunjiMessages;
}
