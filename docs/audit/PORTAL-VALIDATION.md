# Utility portal validation — 2026-10-29

Five package-owned pages are available in the full local portal on port 5184.
No new stylesheet or visual component system was added. Consumer source remains
unchanged. This is not a deployment to design.punji.app.

- Lint and portal TypeScript check: pass.
- Library tests: 155 pass (17 files).
- Package build, strict package/type/export checks and size budgets: pass.
- Chrome browser matrix: 20 page/viewport/theme combinations (five pages ×
  390/1440 × light/dark), with no page/console errors, document overflow or
  serious/critical axe violations in the documented article content.
- Money digits/language, malformed money, partial/precision input states,
  invalid Gregorian dates, fiscal conversion, live row updates and explicit
  re-sorting interactions: pass.
- All 20 full-page screenshots inspected. Initial first-column nowrap rules
  pushed API descriptions beyond the phone view; reused existing ds-type
  wrapping to fix this. Reduced fiscal JSON output to readable results.
- Browser tests caught ne-NP grouping differences from Node; numeric grouping
  is now explicitly South Asian in both languages.

Artifacts: test-results/portal/*Page-{390,1440}-{light,dark}.png and results.json.
These are gitignored and reproducible with CHROME_CHANNEL=chrome npm run check:portal
while npm run portal is running. The bridge's dependency on the sibling consumer
portal remains documented in portal/README.md; no source migration occurred.
