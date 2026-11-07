---
"@punji/ui": minor
---

Components now say when a Bikram Sambat date is a guess. A date in a projected BS month (after the last month the Nepal Panchanga Nirnayak Bikas Samiti has published) shows the word "projected" with a tooltip and screen-reader explanation in IssueCard, CorporateActionTimeline, DematAccountCard, EdisConfirmation and the Article `Timeline`; an unverified month adds screen-reader text only. The BS `Calendar` and `DatePicker` show a note under the heading while the visible month is projected (days stay selectable). `FinancialPeriodSelector` marks a period whose `projected` flag is set, and `DateRangePresetList` marks a preset with `projected: true` (`DateRangePreset` gains an optional `projected`). Words are replaceable through `labels` (`projected`, `projectedHint`, `unverified`; `CalendarLabels` also has `projectedMonth`, with Nepali defaults). Additive; nothing breaks.
