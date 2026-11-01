'use client';

/**
 * PunjiLocaleProvider: one place to give every Punji component its words in the reader's language. Components merge
 * their English defaults, then the provider's pack, then their own `labels`/`messages` props (props always win).
 * Without a provider nothing changes. If you prefer no context, pass a pack's namespace straight into a component:
 * `<TransferReview labels={ne.messages.transferReview} />`.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { PunjiLocalePack, PunjiMessages } from './types.ts';

const EMPTY: PunjiMessages = {};
const LocaleContext = createContext<{ locale: string; messages: PunjiMessages }>({ locale: 'en', messages: EMPTY });

export interface PunjiLocaleProviderProps {
  /** A pack from `@punji/ui/locale/ne`, `/hi` or `/bn`, or your own. Omit for English. */
  locale?: PunjiLocalePack;
  /** Your own overrides, merged over the pack namespace by namespace. */
  messages?: PunjiMessages;
  children: ReactNode;
}

/** Merge message catalogues namespace by namespace; later ones win key by key. */
export function mergeMessages(...catalogues: readonly (PunjiMessages | undefined)[]): PunjiMessages {
  const out: Record<string, unknown> = {};
  for (const catalogue of catalogues) {
    if (!catalogue) continue;
    for (const [key, value] of Object.entries(catalogue)) {
      const prior = out[key];
      out[key] = value && typeof value === 'object' && !Array.isArray(value) && prior && typeof prior === 'object' ? { ...prior, ...value } : value;
    }
  }
  return out as PunjiMessages;
}

export function PunjiLocaleProvider({ locale, messages, children }: PunjiLocaleProviderProps) {
  const value = useMemo(() => ({ locale: locale?.locale ?? 'en', messages: mergeMessages(locale?.messages, messages) }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** The provider's messages and locale tag ('en' and no messages without a provider). For components and your own. */
export function useLocaleMessages(): { locale: string; messages: PunjiMessages } {
  return useContext(LocaleContext);
}
