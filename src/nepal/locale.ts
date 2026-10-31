/** Display helpers only. Decimal calculations belong in money.ts. */
export type NepalLanguage = 'en' | 'ne';
export interface NepalNumberOptions {
  language?: NepalLanguage;
  digits?: 'latn' | 'deva';
  fractionDigits?: number;
  missing?: string;
}
export const NEPAL_TIME_ZONE = 'Asia/Kathmandu';
export const BS_MONTHS = {
  en: ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
  ne: ['वैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'],
} as const;
