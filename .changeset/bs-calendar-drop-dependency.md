---
"@punji/ui": minor
---

`@punji/ui` no longer depends on `@remotemerge/nepali-date-converter`: it now has no runtime dependencies (React and React DOM remain peers). Bikram Sambat conversion runs on punji-ui's own month-length table, and every BS month carries provenance (`official`, `cross-checked`, `unverified` or `projected`; see `toBS`, `toAD` and `bsDateStatus`). Install size shrinks by the dependency and `@punji/ui/nepal/calendar` is lighter. User-visible differences from the previous release:

- Disputed years 1977, 1981, 1991 and 1998 BS now follow the majority of independent sources, so some month lengths and the Gregorian dates they map to shift by a day.
- Projected years 2084 to 2099 BS now use the most widely shared projection instead of copies of earlier years. Dates there can move by up to 2 days and are flagged `projected` until the Nepal Panchanga Nirnayak Bikas Samiti publishes them.
- The last convertible date moves from 2043-04-13 to 2043-04-15 AD (2099-12-30 BS); `calendarLimits('bikram-sambat').max` follows. Conversions outside 1975-01-01 to 2099-12-30 BS still throw.
- Components mark projected dates with the word "projected" (see the UI markers change).

CI now fails if a BS-calendar package is imported or added to `dependencies`.
