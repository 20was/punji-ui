/**
 * The payment-field kit's pure checks: IBAN, card number, expiry and security code, SWIFT/BIC, India IFSC and UPI
 * VPA, UK sort code and account number, US ABA routing number, and Nepal bank account numbers. Every check accepts
 * pasted text with spaces, dashes and Devanagari (or other script) digits, removes invisible characters and says so,
 * and returns `{ state, value, display, reason, cleaned }`. No React, no browser globals, never throws, never logs.
 */
export { compactPaymentInput, luhnValid, mod97, stripInvisible, type PaymentCheck, type PaymentReason, type PaymentState } from './normalize.ts';
export * from './iban.ts';
export * from './card.ts';
export * from './bank-codes.ts';
