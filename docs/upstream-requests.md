# Upstream requests

## CompanySearch: avoid shadowing the keyboard state ref

Rename the inner `live` boolean inside `combo` to `inputLive`, including the two ARIA expressions. It shadows the outer `live` state ref and fails this package’s no-shadow lint. The manifest applies this local naming-only adapter until the source is updated.

## Standalone number formatting

The package intentionally keeps the stable `Rs` prefix and `en-IN` grouping in its reviewed internal helpers. The web `rs` helper now reads product reader-language state; its hash was reviewed rather than importing that global state. Compact formatting strips the reader-language import through the manifest. A future generic locale/currency API should take explicit parameters, without importing product language state.
