---
'@punji/ui': minor
---

Wallets and payments: `@punji/ui/emvco-qr` (build and parse EMVCo merchant QR payloads with CRC-16 and bigint amounts), a dependency-free QR encoder (`@punji/ui/qr-code/matrix`) and `QrCode` (`@punji/ui/qr-code`), `PaymentQrCard` (scan-to-pay card that shows what its payload says, refuses a damaged code, hides an expired one and offers an add-amount fallback), `AmountKeypad` (exact on-screen amount entry with `max` and quick amounts), `PinPad` (masked transaction PIN pad that never writes digits to the page, with a crypto-random shuffle option), and Nepal mobile numbers: `@punji/ui/nepal/mobile` helpers with a data-driven NTC, Ncell and SmartCell prefix table and `MobileNumberInput`. Styles in `css/wallet.css`.
