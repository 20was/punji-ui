/** The payment fields' English words: field names and messages. Replace them with `messages`, `fieldName` or a locale pack. */

/** Which identifier a payment field holds. */
export type PaymentFieldKind = 'iban' | 'cardNumber' | 'cardExpiry' | 'cardCvc' | 'bic' | 'ifsc' | 'upi' | 'sortCode' | 'ukAccount' | 'abaRouting' | 'nepalAccount';

export interface PaymentFieldMessages {
  /** Characters that cannot be in the value. */
  characters: string;
  /** Too many characters. */
  length: string;
  /** The wrong shape (letters where digits belong, a bad prefix). */
  format: string;
  /** Check digits that do not add up. */
  checksum: string;
  /** A country code that is unknown or not accepted. */
  country: string;
  /** A card network that is not accepted, or unknown. */
  brand: string;
  /** Expiry month outside 01 to 12. */
  month: string;
  /** Expiry in the past. */
  expired: string;
  /** Expiry implausibly far ahead. */
  tooFar: string;
  /** UPI: the part before "@". */
  handle: string;
  /** UPI: the part after "@". */
  provider: string;
  /** Left before it was complete. */
  incomplete: (field: string) => string;
  /** Announced once complete and well formed. Not a verification. */
  valid: (field: string) => string;
  /** Announced when invisible characters were removed from a paste. */
  cleaned: string;
  /** A UPI address that looks like a saved payee's but differs. */
  lookalike: (trusted: string) => string;
}

export const PAYMENT_FIELD_MESSAGES: PaymentFieldMessages = {
  characters: 'Use only letters and digits.',
  length: 'This is too long. Check for an extra character.',
  format: 'This is not in the right format. Check each character.',
  checksum: 'The check numbers do not match. Check for a typing slip.',
  country: 'This country code is not accepted here.',
  brand: 'This type of card is not accepted.',
  month: 'Enter a month from 01 to 12.',
  expired: 'This card has expired.',
  tooFar: 'Check the year: it is too far ahead.',
  handle: 'Check the name before the @.',
  provider: 'Check the bank or app handle after the @.',
  incomplete: (field) => `Enter the full ${field}.`,
  valid: (field) => `${field} complete. No typing slips found.`,
  cleaned: 'Hidden characters were removed from what you pasted.',
  lookalike: (trusted) => `This looks like ${trusted}, a saved payee, but it is different. Check it before you pay.`,
};

export const PAYMENT_FIELD_NAMES: Record<PaymentFieldKind, string> = {
  iban: 'IBAN', cardNumber: 'card number', cardExpiry: 'expiry date', cardCvc: 'security code', bic: 'SWIFT/BIC code', ifsc: 'IFSC',
  upi: 'UPI ID', sortCode: 'sort code', ukAccount: 'account number', abaRouting: 'routing number', nepalAccount: 'account number',
};
