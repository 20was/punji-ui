---
"@punji/ui": minor
---

Bikram Sambat provenance API on `@punji/ui/nepal/calendar` (additive, nothing breaks). `toBS(ad, options?)` and `toAD(bs, options?)` return `{ date, status, projected, verified, sources }`, where `status` is `official`, `cross-checked`, `unverified` or `projected` for the BS month, and `options.policy` (`flag` default, `throw`, `null`, `allow`) decides what a projected or unverified month does; outside the table they always throw (or return null under `null`) and never extrapolate. `bsDateStatus(bs)`, `BsProvenanceError`, `BS_TABLE_RANGE`, `BS_VERIFIED_RANGE` and `BS_OFFICIAL_THROUGH` are exported. `getNepalFiscalPeriod`, `nepalFiscalYearPeriods`, `nepalFiscalQuarterPeriods`, `nepalFiscalMonthPeriods` and the Nepal date-range presets gain `projected: boolean`, true when the start or end falls in a projected month (FY 2083/84 ends in one today). New guide: Bikram Sambat calendar data.
