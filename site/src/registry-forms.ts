// Pages for the Wave 2 form pieces: PercentageInput, OtpInput, StatementUpload and date-range presets. Kept apart from
// registry.ts so they merge cleanly with pages added in parallel. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const FORMS_PAGES: readonly PageDef[] = [
  {
    slug: 'percentage-input',
    title: 'PercentageInput',
    description: 'A field for rates such as brokerage, commission and interest. The value is an exact decimal string, never a float, with Devanagari digits and min and max.',
    lead: 'A rate field that keeps exactly what was typed, refuses extra decimals instead of rounding, and hands you the rate in basis points.',
    group: 'forms',
    kind: 'component',
    summary:
      'A field for a rate: brokerage, commission, interest, a discount. The value is a plain decimal string in percent units (\'0.4\' means 0.4%), never a float. Devanagari and Arabic-Indic digits and a pasted percent sign are accepted, a fraction longer than `maxFractionDigits` is refused rather than rounded, and `onValueChange` reports the exact string, a state, the rate in basis points as a bigint and whether it is outside `min` and `max`.',
    use: [
      'A fee, commission, interest or tax rate the person types: brokerage on a trade, the rate on a fixed deposit, a loan margin.',
      'Multiply an amount by `basisPoints` with `divideRounded` from `@punji/ui/calculations` and a rounding mode you choose; the field never rounds for you.',
      '`min` and `max` for the range your product allows (for example 0 to 100). The message appears once the field is left; pass `error` to say it your way.',
    ],
    avoid: [
      'Money: use `CurrencyInput`. Counts and lots: use `NumberField`.',
      'Reading the display text (`digits="deva"` shows Devanagari): read `onValueChange`.',
      'Treating `min` and `max` as validation on their own. They guide the person; check the rate again on your server.',
    ],
    api: [...ui('percentage-input', 'PercentageInput', 'PercentageInputChange')],
    examples: [
      { id: 'basic', title: 'Brokerage on a trade', note: 'The fee is the order value times the rate in basis points, exact and rounded half-up to the paisa.' },
      { id: 'devanagari', title: 'Devanagari digits', note: 'digits="deva" shows १२.५; typing in either script works and the value stays ASCII.' },
      { id: 'range', title: 'Limits and messages', note: 'The rate may go outside 0 to 24; the message shows after the field is left.' },
    ],
    keyboard: ['Standard text input: type, paste, Tab in and out.', 'A paste is cleaned (spaces and a percent sign dropped, Devanagari digits converted) and refused whole when it is not a rate.', 'On blur, an unfinished "12." becomes "12" and a lone "-" or "." clears.'],
    accessibility: [
      'A native `<label for>`; "(percent)" is added to the accessible name, and the visible % is hidden from screen readers.',
      'Hint and error use `aria-describedby` and `aria-invalid`; the error is a live `role="alert"`.',
      '`inputMode="decimal"` asks a phone for the decimal keypad. The text is right-aligned so digits line up in a column of rates.',
    ],
    responsive: ['Fills its container; `size="lg"` gives a 44px target for forms and `md` suits a toolbar.'],
    notes: {
      title: 'Limits',
      points: [
        '`basisPoints` is exact only up to two fraction digits (0.01%). With `maxFractionDigits` above 2 it is null when the rate needs more; use `value` and your own exact arithmetic then.',
        'Out-of-range values are reported, not clamped, so what was typed stays visible. `state` is \'partial\' for text such as "12." or "-".',
        'Only a dot is accepted as the decimal mark, because Nepali and Indian locales use it and a comma could be a group mark.',
      ],
    },
    related: ['currency-input', 'field', 'financial-calculations'],
  },
  {
    slug: 'otp-input',
    title: 'OtpInput',
    description: 'A one-time code field with one box per character: paste and SMS autofill, numeric or alphanumeric, masked option, one group label, and left-to-right in RTL.',
    lead: 'Enter a code from an SMS or authenticator app, one box per character, with paste, autofill and full keyboard support.',
    group: 'forms',
    kind: 'component',
    summary:
      'A one-time code as one box per character. The group has one label and each box has its own name ("Digit 3 of 6"). Typing moves forward, Backspace moves back, the arrows, Home and End move between boxes, and a paste or an SMS autofill spreads across the boxes. Numeric by default, alphanumeric on request, with an option to mask the characters. The boxes always run left to right, even on a right-to-left page.',
    use: [
      'Confirming a bank or broker transaction, login or password reset with a code sent by SMS or an authenticator app.',
      '`onComplete` to submit as soon as the last box is filled; `value` and `onChange` when you hold the code in state.',
      '`mask` for a PIN. `name` to submit the code with a form.',
    ],
    avoid: [
      'Checking the code in the browser: the code is verified on your server, and the field never knows whether it is right.',
      'Long free-form codes: use a normal `Field`. Boxes suit 4 to 8 characters (the limit is 12).',
    ],
    api: [...ui('otp-input', 'OtpInput')],
    examples: [
      { id: 'basic', title: 'SMS code', note: 'Six digits. Type, paste "482 913" or accept the autofill; onComplete fires once.' },
      { id: 'masked', title: 'Masked PIN', note: 'mask turns the boxes into password boxes; paste and keyboard work the same.' },
      { id: 'error', title: 'Error and alphanumeric', note: 'A rejected code marks every box invalid and is announced; an eight-character recovery code accepts letters too.' },
    ],
    keyboard: [
      'Typing a character fills the box and moves to the next. Focus cannot skip an empty box: clicking ahead moves to the first empty one.',
      'Backspace clears the current box (or the previous one when the current is empty) and moves back; Delete clears the current box.',
      'ArrowLeft and ArrowRight, Home and End move between boxes. Paste fills from the box where it lands; a full-length code replaces everything.',
    ],
    accessibility: [
      'One `role="group"` named by the visible label, linked to the hint or error with `aria-describedby`; each box is named separately ("Digit 3 of 6"), translatable through `cellLabel`.',
      'The first box has `autocomplete="one-time-code"`, so iOS and Android offer the SMS code and the whole code arrives in one change, which the field spreads across the boxes.',
      'The boxes are `dir="ltr"` always, because a code is read in the order it was sent; the label, hint and error follow the page direction. Boxes are 44px (`md` is 36px).',
      'An error is a `role="alert"` and sets `aria-invalid` on every box.',
    ],
    responsive: ['Boxes shrink to fit a narrow container; at 8 or more boxes on a phone they drop below 44px, so keep codes to six where you can.'],
    notes: { title: 'Limits', points: ['Not reviewed with VoiceOver or NVDA yet (see the roadmap).', 'Devanagari and Arabic-Indic digits are converted to ASCII; other scripts are dropped.'] },
    related: ['field', 'button', 'statement-upload'],
  },
  {
    slug: 'statement-upload',
    title: 'StatementUpload',
    description: 'Choose or drop a CSV or PDF statement. Checks type, size, empty files and duplicates with clear messages, shows name and size, and never makes a request.',
    lead: 'Pick or drop a bank or broker statement, see what was accepted or why not, and remove it. You handle the upload.',
    group: 'forms',
    kind: 'component',
    summary:
      'Choose or drop bank or broker statements (CSV and PDF by default). It collects `File` objects and checks each one: type, size, empty and duplicates, with a message for every refusal. Accepted files are listed with name and size and can be removed. It makes no network request: you receive the files in `onChange` and upload them yourself.',
    use: [
      'Importing a broker statement or bank export into a portfolio or ledger.',
      '`accept` and `maxSize` to set the rules; `multiple` and `maxFiles` for several months at once.',
      '`onReject` to log or show refusals your own way; `error` for a failed upload.',
    ],
    avoid: [
      'Trusting the checks: the browser\'s file type and size are hints. Validate content, size and type again on your server.',
      'Uploading from inside the component: it deliberately has no URL, and holds no credentials.',
      'Sensitive statements over a page you do not serve over HTTPS.',
    ],
    api: [...ui('statement-upload', 'StatementUpload', 'StatementRejection', 'validateStatementFile', 'matchesAccept', 'formatFileSize', 'describeAccept')],
    examples: [
      { id: 'basic', title: 'One statement', note: 'CSV or PDF up to 5 MB. A new valid file replaces the old one; Upload is your own button.' },
      { id: 'multiple', title: 'Several months', note: 'multiple with maxFiles. Duplicates and files past the limit are refused with a reason.' },
      { id: 'validation', title: 'Limits and messages', note: 'A 100 KB limit and your own wording; the refusals are announced as an alert.' },
    ],
    keyboard: ['Tab to "Choose file" and press Enter or Space to open the file picker; this is the full keyboard route, dragging is an extra for pointer users.', 'Each file has a Remove button; after removing, focus returns to "Choose file".'],
    accessibility: [
      'A `role="group"` named by the visible label and described by the hint and any errors.',
      'Refusals are a `role="alert"` list, one line per file. Adding and removing a file is announced through a polite status region.',
      'Buttons are 44px. The dragging state is shown by border and background, not by colour alone, and the whole control works without a pointer.',
    ],
    responsive: ['Fills its container; the file name truncates with an ellipsis and the size stays visible.'],
    notes: {
      title: 'Security boundary',
      points: [
        'The component reads only the file name, size and type, never the contents. A file named .csv can hold anything; check the content on the server.',
        'Statements are sensitive. Send them over HTTPS to your own server and do not keep them in the browser longer than the upload.',
        'For CSV imports of amounts, parse them with `parseMinorUnits` so a value is never rounded silently.',
      ],
    },
    related: ['field', 'button', 'csv-export'],
  },
  {
    slug: 'date-range-presets',
    title: 'Date range presets',
    navTitle: 'Range presets',
    description: 'Quick ranges for DateRangePicker: Today, This week, This month, Last 30 days and the Nepal fiscal year (Shrawan to Asar) to date, as pure exact functions.',
    lead: 'Today, this week, this month, last 30 days and the fiscal year to date, ready for a range picker and computed without Date.',
    group: 'forms',
    kind: 'utility',
    summary:
      'Pure helpers that turn today\'s date into the ranges people pick most, and a `presets` prop on `DateRangePicker` that shows them as buttons above the calendar. The Nepal fiscal year runs from 1 Shrawan to the end of Asar and is computed from Bikram Sambat tables; a Gregorian fiscal year takes its start month. Everything is a civil date string (YYYY-MM-DD) and never reads the clock or the time zone.',
    use: [
      'Statement, report and history filters where "this month" and "fiscal year to date" are the common choices.',
      '`nepalDateRangePresets` for Nepal: BS months and the Shrawan fiscal year. `dateRangePresets` with `fiscalYearStartMonth` for another country (4 for April, 7 for July).',
      'Pass `today` from your own clock in the business time zone (`instantToNepalDate`); the helpers never read the clock.',
    ],
    avoid: [
      'Calling `new Date()` inside the helpers\' callers without choosing a time zone: near midnight the day will differ from Kathmandu.',
      'Expecting a future end date. This week, This month and Year to date end today because the future has no entries.',
    ],
    api: [
      ...ui('date-range-presets', 'dateRangePresets', 'presetRange', 'shiftDate', 'dayOfWeek', 'DateRangePreset', 'DateRangePresetId'),
      ...ui('date-range-presets/nepal', 'nepalDateRangePresets', 'nepalPresetRange', 'nepalFiscalYearToDate', 'nepalLastFiscalYear'),
      ...ui('date-picker', 'DateRangePresetList'),
    ],
    examples: [
      { id: 'nepal', title: 'Nepal (BS)', note: 'Nepali labels and Devanagari digits; this month is the BS month and the fiscal year starts on 1 Shrawan.' },
      { id: 'gregorian', title: 'Gregorian fiscal year', note: 'A July fiscal year, English labels, weeks starting Monday.' },
      { id: 'helper', title: 'The pure helper', note: 'The same function without a picker, as a table of exact ranges.' },
    ],
    keyboard: ['Presets are buttons in the picker\'s dialog: Tab between them and the calendar, Enter or Space applies one at once and closes the dialog.'],
    accessibility: [
      'The presets are a `role="group"` named "Quick ranges" (translatable through the picker\'s `labels.presets`); the one matching the current range has `aria-pressed`.',
      'A preset that includes a day outside `min` and `max`, or an unavailable day, is disabled rather than silently trimmed.',
    ],
    responsive: ['The buttons wrap above the calendar and become 44px tall on touch screens.'],
    notes: {
      title: 'Limits',
      points: [
        'Nepal functions need dates inside BS 1975 to 2099 and throw a RangeError otherwise. A fiscal year is a Shrawan to Asar year in BS; it does not follow July 16.',
        'The Nepali labels have not had a native editorial review yet. Override any label with `labels`.',
        'A preset applies immediately and does not move the open calendar; if you want the person to adjust it first, let them pick days in the calendar instead.',
      ],
    },
    related: ['date-picker', 'period-selector', 'financial-calculations'],
  },
];
