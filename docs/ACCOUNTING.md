# Accounting display components

Seven display components and a pure module of arithmetic helpers for bookkeeping screens: `DebitCredit`,
`LedgerTable`, `JournalEntryView`, `TrialBalance`, `StatementTable`, `PaymentStatus` and
`FinancialPeriodSelector`, with `@punji/ui/ledger` (`isBalanced`, `trialBalance`, `runningBalance`, `rollUp`,
`ledgerToCsv`, ...). Each component has a subpath (`@punji/ui/ledger-table`, ...); all styles are in
`@punji/ui/css/accounting.css` (and `styles.css`).

**What this is not.** These are display and arithmetic helpers. They are not an accounting system, a general
ledger, a chart of accounts or a tax engine. There is no tax rate, no VAT logic, no jurisdiction rule, no currency
conversion and no posting, closing or reconciliation. "VAT Payable" in the examples is an ordinary ledger account
name. VAT invoices, income tax from caller-supplied slabs, payslips, aging and TDS are in [TAX.md](TAX.md). A browser can be edited by anyone: **the server that stores the books must validate every amount, journal and
total again** (balanced journals, no negatives, period locks, permissions). A balanced trial balance does not prove
the books are right.

**Numeric contract** (see [FINANCIAL.md](FINANCIAL.md)). Every ledger value is a `bigint` in minor units (paisa,
cents). Nothing rounds, converts through `Number` or sums silently. Amounts must be `>= 0n`; a line is a debit or a
credit, never both. Invalid input throws (`TypeError` for a non-bigint, `RangeError` for negative or two-sided), and
the components show an alert instead of a number when they are handed invalid amounts. The only floating-point value
is the variance percent in `StatementTable`, which comes from `percentageChange` and is display-only.

Money and locale: components take `money` (a `MoneyFormatConfig`), defaulting to `nepalLedgerMoney` (NPR, `en-IN`
lakh/crore grouping, no currency mark: name the currency once in the caption). Pass `{ currency: 'USD', locale:
'en-US', display: 'symbol' }` for another currency. The data in the examples is invented.

## Ledger helpers (`@punji/ui/ledger`)

```ts
interface LedgerEntry { id: string; date: CalendarDate; account: string; description?: string; debit: bigint; credit: bigint; reference?: string }
interface JournalEntry { id: string; date: CalendarDate; memo?: string; lines: { account: string; debit: bigint; credit: bigint }[] }
```

- `journalTotals(journal)` `{ debit, credit }`, `journalImbalance(journal)` (debit - credit), `isBalanced(journal)`.
- `runningBalance(entries, { normal: 'debit' | 'credit', opening? })` gives `{ entry, balance }[]` in the order given.
  `normal` is the side that increases the account (assets, expenses: debit; liabilities, equity, income: credit). A
  balance past zero is negative, i.e. on the other side. Last balance = `opening + Σ(normal side - other side)`.
- `accountBalance(entries, account, options)` closing balance of one account among many entries.
- `trialBalance(entries | journals)` gives per-account `{ debit, credit, net }`, `totals`, `netTotals`, `balanced` and
  `difference`. It reports whether the books as a whole balance; two opposite errors cancel, so also check each
  journal with `isBalanced`.
- `journalsToEntries(journals)` flattens journals to postings (`id` is `${journal.id}:${index}`).
- `assertValidAmounts`, `signedMovement`, `statementPeriods`.
- `rollUp(rows)`, `findRollUpMismatches(rows)`: see StatementTable.
- `ledgerToCsv(entries, { currency?, exponent?, balance?, normal?, opening?, headers?, ...CsvOptions })`: exact decimal
  amounts (`11300.00`), ISO dates, optional signed running balance (debit positive, credit negative). It goes through
  `toCsv`, so formula neutralisation stays on: an account or description such as `=HYPERLINK(...)` is exported with a
  leading apostrophe.

The module is pure (no React, no browser globals; enforced by `scripts/check-boundaries.mjs`).

## DebitCredit

One ledger amount with its side. Use inside a figure column or a list. For two separate Debit and Credit columns use
the `column` variant in each cell.

Props: `value` (signed net in minor units: positive debit, negative credit; `null` shows a dash with a spoken "No
value"), `variant` (`suffix` default: `12,500.00 Dr`; `signed`: signed amount, credits in accounting parentheses
when `accounting` (default true for this variant), then the side; `column` with `column="debit" | "credit"`: the
amount only under its own column, blank otherwise), `labels` (`debit`, `credit`, `debitSpoken`, `creditSpoken`: default
`Dr`, `Cr`, `debit`, `credit`), plus the money options (`currency`, `preset`, `locale`, `display`, `numberingSystem`,
`missing`, `missingLabel`, `testId`, `className`). Accessibility: the letters are `aria-hidden` and the words are
read ("12,500.00 debit"); a zero has no side. The amount is a `MoneyDisplay` (`<data value>`).

```tsx
<DebitCredit value={-300000n} />                      // 3,000.00 Cr
<DebitCredit value={-300000n} variant="signed" />     // (3,000.00) Cr
<DebitCredit value={entry.debit - entry.credit} variant="column" column="debit" />
```

## LedgerTable

The general ledger of one account: date, reference, description, debit, credit and a running balance, with an
opening row, a period-total row and a closing row. A composition over `DataTable` (sticky head, caption, loading
and empty rows). Not for a list of mixed accounts (group first) and not for editing.

Props: `caption`, `entries` (in the order to show, oldest first; not sorted here), `normal`, `opening`, `money`,
`formatDate` (default `3 Aug 2024` from the Gregorian date; pass `d => formatBSDate(gregorianToBS(d))` for Bikram
Sambat), `labels`, `sideLabels`, `showReference`, `maxHeight` (sticky head inside a scrolling box), `bare`, `state`
(`ready`, `loading`, `error`), `emptyLabel`, `loadingLabel`, `errorLabel`, `retryLabel`, `onRetry`, `testId`.

The balance names its side (`Dr`/`Cr`, with the words spoken), so an overdrawn debit account reads `Cr`. Under 640 px
each entry becomes a card (date, description, then Debit, Credit and Balance with their names); the reference moves
under the description. Keyboard: the table region is focusable and scrolls with the arrow keys. Invalid amounts
(negative, two-sided, not bigint) show an alert instead of a balance.

```tsx
<LedgerTable caption="Cash ledger, Shrawan 2081 (NPR)" entries={cashEntries} normal="debit" opening={2500000n} />
```

## JournalEntryView

One journal with its lines, a totals row and a status. When debits and credits differ it says `Out of balance by 5.00
(debits exceed credits)` with a warning icon (the balanced state has a check), in a `role="status"` line, never by
colour alone. It displays the entry; it does not correct or reject it.

Props: `journal`, `renderAccount`, `money`, `formatDate`, `labels`, `headingLevel` (2-6, default 3), `bare`, `testId`.
A journal with an invalid line shows an alert; one with no lines shows an empty message.

## TrialBalance

Accounts by debit and credit, a totals row and a `Balanced` / `Out of balance by X` status line (check or warning
icon plus words). Props: `caption`, `data` (ledger entries or journals), `basis` (`net` default: each account's net
balance on its own side; `totals`: gross debits and credits), `renderAccount`, `money`, `labels`, `maxHeight`,
`bare`, `state`, `emptyLabel`, `loadingLabel`, `errorLabel`, `retryLabel`, `onRetry`, `testId`. The columns are real
table headers, so a screen reader announces "32,200.00 credit" with the account.

## StatementTable

An income statement, balance sheet or cash-flow style report from a typed tree.

```ts
type StatementRow = StatementLine | StatementSection;
interface StatementLine { kind: 'line'; id; label; values: Record<period, bigint | null>; effect?: 'add' | 'subtract' }
interface StatementSection { kind: 'section'; id; label; rows: StatementRow[]; subtotal?: { label; values?; grand? }; effect? }
```

Props: `caption`, `periods` (`{ key, label }[]`, one column each; label them FY 2080/81 and FY 2081/82 however you
like), `rows`, `variance` (`{ from, to }` adds Change and Change % columns: `to - from` exact, percent from
`percentageChange`, a dash when either side is missing or the base is not positive), `negative` (`parentheses`
default, or `minus`), `money`, `labels`, `percentDigits`, `bare`, `maxHeight`, `state` and the usual state props.
Sections indent by depth; a `subtotal` row is bold with a rule above, `grand: true` gets a double rule.

**It never adds a subtotal for you.** It prints the values it is given; a subtotal without values prints a dash.
Call `rollUp(rows)` yourself when you want the sums (`effect: 'subtract'` on a section such as expenses makes it
count negatively in its parent). In development the component calls `console.error` when a provided subtotal
disagrees with `rollUp` (ids only, never amounts) and still shows your values: the warning is for you, the figures
are not corrected. For a balance sheet put the checking where it belongs: the server.

```tsx
const rows = rollUp(statementTree);
<StatementTable caption="Income statement (NPR)" periods={[{ key: '2080/81', label: 'FY 2080/81' }, { key: '2081/82', label: 'FY 2081/82' }]}
  rows={rows} variance={{ from: '2080/81', to: '2081/82' }} />
```

On a phone the label column is narrow and sticky, the periods stay visible and the variance columns scroll.

## PaymentStatus

`paid`, `partial`, `unpaid`, `overdue`, `void` as a pill with an icon and words (each status has its own icon shape;
void is also struck through). It labels a status you already know: it does not compare dates or amounts to decide
"overdue". Props: `status`, `labels` (translate), `size`, `className`, `testId`. Composes `StatusPill`.

## FinancialPeriodSelector

Pick a reporting period from a list you supply: a `Select` for the period and, when the list has two or more `kind`s,
a `ChoiceGroup` to switch kind (switching keeps the same time span when periods carry `start` and `end`). The
selected period's `detail` (for example its BS and AD range) is shown under it and tied to the select with
`aria-describedby`. Controlled: `periods`, `value` (id), `onChange(id, period)`, `label`, `kindLabels`,
`kindGroupLabel`, `showDetail`, `size`, `testId`.

```ts
interface FinancialPeriod { id: string; kind: string; label: string; detail?: string; start?: CalendarDate; end?: CalendarDate }
```

There is no fiscal-year rule in the component. `nepalFiscalYearPeriods(from, to)` builds fiscal years from the existing
`getNepalFiscalPeriod` (1 Shrawan to the day before the next 1 Shrawan; the dates come from the converter's tables),
and `nepalFiscalMonthPeriods(startYear)` / `nepalFiscalQuarterPeriods(startYear)` read the year's own twelve BS month
starts (three consecutive months per quarter). Years outside the converter's range throw. For any other jurisdiction
pass your own list (`{ id: 'fy-2024', kind: 'year', label: 'FY ending 31 Mar 2025' }`). The package ships no tax or
filing calendar.

## ReconciliationMatcher (`@punji/ui/reconciliation-matcher`)

Bank statement lines beside the bank account's ledger entries. Both lists are `ReconcileItem`s with a signed bigint
`amount` seen from the account holder (money in positive, money out negative). Tick lines on both sides and match
them when their totals agree exactly: one-to-one, one-to-many (a rent paid net of TDS plus the TDS line) or
many-to-one (a payroll paid as one transfer per employee). It is controlled: keep `matches` and pass
`onMatchesChange`.

```tsx
<ReconciliationMatcher statement={lines} ledger={bankEntries} matches={matches} onMatchesChange={setMatches}
  statementBalance={closingPerBank} ledgerBalance={closingPerBooks} onCreateEntry={postToBooks} />
```

Pure helpers on the same subpath: `suggestMatches(statement, ledger, { dateWindow, matched })` proposes one-to-one
matches on equal amounts within the window (equal references first, then the nearest date); `reconciliationSummary`
returns deposits in transit, outstanding payments, receipts and charges not yet in the books, both adjusted balances,
the difference and `reconciled`; `matchDifference` and `sumAmounts` do the exact sums. An id used in two matches
throws. "Match selected" stays focusable and says why when the totals differ; Ctrl+Enter or ⌘Enter matches from
anywhere inside. Each list is a focusable scroll region. Styles in `css/reconciliation.css`.

## Testing

`test/ledger.test.ts` has fast-check properties (balanced journals sum to zero; the last running balance equals
`opening + Σ(normal side - other side)`; trial balance totals are equal when every journal balances, and one
unbalanced journal makes the difference exactly its imbalance) and roll-up and CSV cases. `test/accounting.test.tsx`
covers each component's behaviour, edge cases and axe.
