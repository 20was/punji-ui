# Roadmap

Punji UI is becoming an independent financial design system.
The maintained [audit and prioritised checklist](docs/audit/README.md) records
implemented foundations and release-critical gaps; [AUDIT.md](AUDIT.md) is the
current consolidated status with severities. The consumer app is a reference,
not the source of truth. Ten reusable modules have been migrated into this
package from it; punji-web does not yet consume `@punji/ui`, the docs portal
still lives there, and nothing is published ([RELEASE.md](RELEASE.md)).
Standards: [QUALITY.md](QUALITY.md). Structure: [ARCHITECTURE.md](ARCHITECTURE.md).

Brand artwork, application routes, authentication, permissions, backend clients,
tax rules and trading execution remain outside this reusable UI package.

## 1. Date picker and calendar

Implemented for local review: Calendar (single/range/multiple), DatePicker and
DateRangePicker, Gregorian/BS display, Nepali/English labels and digits, strict
input, date bounds, unavailable intervals and keyboard navigation. Examples live
at `/components/calendar` and `/components/date-picker`; the full local portal's
roadmap links to both. See [API and limits](docs/CALENDAR.md) and
[upstream research](docs/research/calendar-2026-10-29.md).

Before release: owner visual review, native Nepali copy review, VoiceOver/NVDA
checks and independent production portal build. Later: multi-month ranges,
time selection, RTL verification and other calendar adapters. Keep date-only
selection separate from instants, financial calculations and business rules.

## 2. Status of other planned work

| Item | Status |
| --- | --- |
| Visual regression and browser axe gate | Done locally; the CI job has not yet run on GitHub |
| Calculations, generic money, hooks, CSV export | Done |
| Migrate remaining reusable punji-web modules (86 of 96 left per the inventory) | Planned |
| Close open visual defects (Card meta, ChoiceGroup dark, DateRangePicker, PriceChart 390, OrderBook 390, overlay font) | Planned, see [AUDIT.md](AUDIT.md) |
| Standalone docs portal and hosting | Planned, owner decision |
| First npm release (rc for punji-web, then 0.1.0) | Planned, needs owner approval |
| punji-web consuming the published package | Planned ([docs/INTEGRATION.md](docs/INTEGRATION.md)) |
| Manual screen-reader testing, virtualised tables, profiling | Planned |
