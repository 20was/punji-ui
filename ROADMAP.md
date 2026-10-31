# Roadmap

Punji UI is becoming an independent financial design system.
The maintained [audit and prioritised checklist](docs/audit/README.md) records
implemented foundations and release-critical gaps. The consumer app is a
reference, not the source of truth; migration has not started.

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
