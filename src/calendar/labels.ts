import type { NepalLanguage } from '../nepal/locale.ts';
/** Override any words to localise another language; no app/business strings. */
export interface CalendarLabels {
  previousMonth: string; nextMonth: string; month: string; year: string; today: string; clear: string;
  chooseDate: string; chooseRange: string; close: string; cancel: string; apply: string; startDate: string; endDate: string;
  gregorian: string; bikramSambat: string; help: string; unavailableRange: string; invalidDate: string;
  invalidYear: string; outsideCoverage: string; formatHint: string; rangeHint: string; required: string; unavailable: string; presets: string;
}
export const calendarLabels: Record<NepalLanguage, CalendarLabels> = {
  en: {previousMonth:'Previous month',nextMonth:'Next month',month:'Month',year:'Year',today:'Today',clear:'Clear',chooseDate:'Choose date',chooseRange:'Choose date range',close:'Close calendar',cancel:'Cancel',apply:'Apply dates',startDate:'Start date',endDate:'End date',gregorian:'AD',bikramSambat:'BS',help:'Arrow keys move by day or week. Home/End move within a week. Page Up/Down change month; hold Shift to change year.',unavailableRange:'This range includes an unavailable date. Choose another end date.',invalidDate:'Enter a valid date in YYYY-MM-DD format.',invalidYear:'Enter a year from {min} to {max}.',outsideCoverage:'Date is outside this calendar’s supported range.',formatHint:'YYYY-MM-DD',rangeHint:'Choose a start and end date.',required:'Choose a date.',unavailable:'This date is unavailable.',presets:'Quick ranges'},
  ne: {previousMonth:'अघिल्लो महिना',nextMonth:'अर्को महिना',month:'महिना',year:'वर्ष',today:'आज',clear:'खाली गर्नुहोस्',chooseDate:'मिति छान्नुहोस्',chooseRange:'मिति अवधि छान्नुहोस्',close:'पात्रो बन्द गर्नुहोस्',cancel:'रद्द गर्नुहोस्',apply:'मिति लागू गर्नुहोस्',startDate:'सुरु मिति',endDate:'अन्तिम मिति',gregorian:'ई.सं.',bikramSambat:'वि.सं.',help:'तीर कुञ्जीले दिन वा हप्ता सार्छ। Home/End ले हप्ताको सुरु वा अन्त्यमा लैजान्छ। Page Up/Down ले महिना र Shift सँग वर्ष सार्छ।',unavailableRange:'यस अवधिमा उपलब्ध नभएको मिति छ। अर्को अन्तिम मिति छान्नुहोस्।',invalidDate:'वर्ष-महिना-दिन ढाँचामा मान्य मिति लेख्नुहोस्।',invalidYear:'{min} देखि {max} सम्मको वर्ष लेख्नुहोस्।',outsideCoverage:'यो मिति पात्रोले समर्थन गर्ने अवधिभन्दा बाहिर छ।',formatHint:'YYYY-MM-DD',rangeHint:'सुरु र अन्तिम मिति छान्नुहोस्।',required:'मिति छान्नुहोस्।',unavailable:'यो मिति उपलब्ध छैन।',presets:'छिटो अवधि'},
};
export const gregorianMonths = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ne: ['जनवरी','फेब्रुअरी','मार्च','अप्रिल','मे','जुन','जुलाई','अगस्ट','सेप्टेम्बर','अक्टोबर','नोभेम्बर','डिसेम्बर'],
} as const;
export const weekDays = {
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  ne: ['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'],
} as const;
