## What and why

<!-- One or two sentences: what changes for someone using the package. -->

## Checklist

- [ ] `npm run verify` passes locally
- [ ] A changeset is added (`npm run changeset`), or this change does not touch what ships
- [ ] Tests cover the behaviour, keyboard included, and axe-core finds no serious issue

### New or changed component

- [ ] General purpose (useful outside one product)
- [ ] Follows a named WAI-ARIA APG pattern or wraps a native element:
- [ ] Any new runtime dependency has a documented licence, maintenance, security and bundle review
- [ ] Size budget added or updated in `.size-limit.json`
- [ ] Tokens only; works in light and dark; one focus ring; 44 px touch targets; reduced motion respected
- [ ] Exported from the root and from its own subpath, with its own CSS file
- [ ] Documentation page added or updated
