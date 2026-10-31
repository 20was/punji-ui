# Package utility documentation in the full Punji portal

Run `npm run portal`, then open:

http://design.localhost:5184/utilities/financial-formatters

The full existing portal shell, component pages, navigation, search and theme
controls remain available. Five package-owned utility pages are registered by
`registry.mjs`; their examples execute the built package's utility/hook exports.
They reuse the portal's Page, Section, Demo and RefTable blocks and the existing
kit controls. No new visual component system or page CSS is introduced.

The existing portal currently lives in the sibling punji-web checkout. The
read-only Vite development adapter in `scripts/portal.mjs` loads that checkout's
configuration and adds routes/registry entries in memory. It does not edit or
migrate the consumer. This is local integration, not a deployed docs release.
Set PUNJI_WEB_DIR to use another checkout and PORTAL_PORT to change the port.
The bridge validates its insertion points and fails if the consumer shell changes.
React is deduplicated to avoid mixing the package and consumer React instances.
Moving the full portal into this repository remains separate architecture work.

Validation:

- `npm run lint`
- `npm run typecheck:portal` after building the library
- `CHROME_CHANNEL=chrome npm run check:portal` with the portal running

The browser check covers all five pages at 390/1440 in light/dark, accessible
article content, document overflow, console/page errors, and interactions for
money digits, malformed input, date validation, fiscal conversion and live
sorting. Screenshots/results go to ignored test-results/portal. All screenshots
must also be visually inspected; automated checks do not certify appearance.

The portal bridge intentionally imports built local modules through private
preview aliases, while displayed import examples use the public @punji/ui
subpaths. Package export-map consistency is independently checked by
`npm run check:exports`. Documentation builds are not included in the npm tarball.

Calendar documentation additionally registers `/components/calendar` and
`/components/date-picker`, and replaces the roadmap route in memory. These import
built Calendar/DatePicker exports and their package styles. Run
`CHROME_CHANNEL=chrome npm run check:calendar` for the feature's browser matrix;
see `docs/CALENDAR.md` for supported calendars and release boundaries.

The Select route now uses `portal/select-page.tsx` and the actual built Select.
The Field, Company Search and Data Table routes load their built package
components. Legacy field, finder and table CSS is isolated in a lower preview
layer, so package styles are exercised in the full portal. Run
`CHROME_CHANNEL=chrome npm run check:select` and
`CHROME_CHANNEL=chrome npm run check:fields` for responsive and touch checks;
`CHROME_CHANNEL=chrome npm run check:table` checks table stacking, labels,
search, filtered result counts, page navigation, sorting, keyboard-accessible
states and overflow at phone and desktop widths.
See `docs/SELECT.md` and `docs/research/field-2026-10-29.md`.
