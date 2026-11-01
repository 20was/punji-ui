# Localisation of component copy

> **The Nepali, Hindi and Bengali packs are machine-drafted and need native review.** They were written without
> review by native speakers. Have the text you use reviewed, and adapted to your product's voice, before customers
> see it. Each pack says so in its file header and in `pack.review === 'machine-drafted'`. Corrections are welcome.

Components ship English words and take `labels` or `messages` props. The locale layer gives them all their words at
once.

| Export | Subpath | What it is |
| --- | --- | --- |
| `PunjiLocaleProvider`, `useLocaleMessages`, `mergeMessages` | `@punji/ui/locale` | Context provider, hook and merge helper |
| `localAmountInWords` | `@punji/ui/locale` | An amount in words in a pack's language |
| `PunjiMessages`, `PunjiLocalePack`, `AmountWordsPack`, `TableMessages`, `PaginationMessages`, `SpoofingMessages` | `@punji/ui/locale` | Types |
| `ne` | `@punji/ui/locale/ne` | Nepali pack |
| `hi` | `@punji/ui/locale/hi` | Hindi pack |
| `bn` | `@punji/ui/locale/bn` | Bengali pack (Bangladesh spelling) |

The packs are not exported from the root `@punji/ui`, so importing the root never pulls in a language. Each pack is
about 5 kB gzip; the provider and helpers about 2 kB.

## Order of precedence

For every string: the component's English default, then the provider's pack, then the provider's `messages`, then
the component's own `labels` or `messages` prop. A key missing anywhere falls back to the step before. Without a
provider nothing changes.

```tsx
import { PunjiLocaleProvider } from '@punji/ui/locale';
import { ne } from '@punji/ui/locale/ne';

<PunjiLocaleProvider locale={ne} messages={{ transferReview: { confirm: 'पठाउनुहोस्' } }}>
  <App />
</PunjiLocaleProvider>
```

The provider sets no `lang` attribute; set `lang` on the element that holds translated text.

## Without context

A pack is plain data. Pass a namespace into the component's own prop:

```tsx
import { hi } from '@punji/ui/locale/hi';

<HoldToConfirm labels={hi.messages.holdToConfirm} onConfirm={send}>भेजें</HoldToConfirm>
```

## Namespaces

| Namespace | Used by |
| --- | --- |
| `transferReview`, `confirmAmount` | `TransferReview`, `ConfirmAmount` |
| `payeeVerification` | `PayeeVerification` |
| `holdToConfirm` | `HoldToConfirm` (also inside `ScamWarning`) |
| `sessionTimeout` | `SessionTimeoutWarning` |
| `scamWarning` (with `scenarios` for all six) | `ScamWarning` |
| `secureField` | `SecureField` |
| `spoofing` | The name-check sentences `TransferReview` lists |
| `paymentFields` (`messages`, `fieldNames`) | The payment fields |
| `idNumberInput`, `panInput` | `IdNumberInput`, `PanInput` |
| `calendar` | `Calendar`, `DatePicker`, `DateRangePicker` words |
| `table` | `DataTable` (empty, loading, search, selection, page controls) |
| `pagination` | `Pagination` |
| `amountWords` | `ConfirmAmount`, `TransferReview` and `localAmountInWords` |

## Amounts in words

`amountWords` holds the language's words for 0 to 99, the six South Asian scale names (kharab, arab, crore, lakh,
thousand, hundred), currency unit names, the suffix ("only") and the word for minus. With a pack that has it,
`ConfirmAmount` prints the words in that language. `localAmountInWords(12345650n, 'INR', hi.messages.amountWords!)`
is "एक लाख तेईस हज़ार चार सौ छप्पन रुपये पचास पैसे मात्र". A currency the pack does not name prints its ISO code
and the minor part as a fraction.

## Limits

- Month and weekday names in the calendar come from its `language` (`en` or `ne`). The `hi` and `bn` packs
  translate the picker's words, not the month names.
- Number formatting is not part of a pack: set `money.locale` and `digits` as before.
- Bengali arab and kharab names are rarely used and especially need review. Hindi and Bengali number words follow
  common spellings; regional variants exist (Bengali কুড়ি for 20 in West Bengal).

## Writing your own pack

Type it as `PunjiLocalePack` and fill any namespaces you need; TypeScript checks every key. Set `review` honestly.
`test/locale.test.tsx` checks that the three packs fill the same keys, cover every scam scenario and calendar label,
and have 100 distinct number words.
