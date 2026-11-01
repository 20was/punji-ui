/**
 * The locale layer: `PunjiLocaleProvider` and `useLocaleMessages` for context, `mergeMessages` to combine catalogues,
 * `localAmountInWords` for amounts in a pack's language, and the message types. The language packs themselves are
 * separate subpaths so you only ship the ones you import: `@punji/ui/locale/ne`, `@punji/ui/locale/hi`,
 * `@punji/ui/locale/bn`. Every pack in this package is machine-drafted and needs native review.
 */
export { PunjiLocaleProvider, mergeMessages, useLocaleMessages, type PunjiLocaleProviderProps } from './context.tsx';
export { localAmountInWords, type LocalAmountWordsOptions } from './words.ts';
export type { AmountWordsPack, PaginationMessages, PunjiLocalePack, PunjiMessages, SpoofingMessages, TableMessages } from './types.ts';
