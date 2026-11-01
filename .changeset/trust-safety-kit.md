---
'@punji/ui': minor
---

Trust and safety kit: `@punji/ui/trust` (`detectSpoofing`, `skeleton`, `areConfusable`: pure UTS #39-style checks for look-alike letters, mixed scripts, bidi controls and invisible characters in payee names, with look-alike detection against trusted names), `TransferReview` and `ConfirmAmount` (amount in figures and words, a spoofing-checked recipient that blocks confirm until acknowledged, changed fields marked in words), `PayeeVerification` (Confirmation/Verification of Payee results: match, close match, no match, unavailable), `HoldToConfirm` (press-and-hold or cooling-off friction), `SessionTimeoutWarning` (WCAG 2.2.1 warning with throttled announcements), `ScamWarning` (scenario-specific scam interstitial with `SCAM_SCENARIOS`) and `SecureField` (`secureFieldAttributes`: correct autocomplete per kind, and the value never written to a DOM attribute). Styles in `css/trust.css`.
