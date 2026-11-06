import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PunjiLocaleProvider, type PunjiLocalePack } from '@punji/ui/locale';
import type { PreviewLocale } from './preview.ts';

// The library's own mechanism: PunjiLocaleProvider takes a pack. English variants need no words, only the tag (it
// picks the rupee mark and number conventions); Nepali loads its pack when first chosen, so no page pays for it up front.
const loadNepali = () => import('@punji/ui/locale/ne').then((m) => m.ne);

const english = (locale: string): PunjiLocalePack => ({ locale, name: 'English', review: 'native-reviewed', messages: {} });

/** Gives the preview inside it the chosen locale through PunjiLocaleProvider (no DOM of its own). */
export function LocaleScope({ locale, children }: { locale: PreviewLocale; children: ReactNode }) {
  const [ne, setNe] = useState<PunjiLocalePack>();
  const wantsNepali = locale === 'ne-NP';
  useEffect(() => {
    if (!wantsNepali) return;
    let live = true;
    void loadNepali().then((pack) => live && setNe(pack));
    return () => {
      live = false;
    };
  }, [wantsNepali]);
  const pack = useMemo((): PunjiLocalePack | undefined => {
    if (locale === 'en-NP') return undefined;
    // The tag is the chosen one ('ne-NP'); the words are the pack's, once it has arrived.
    return wantsNepali ? { ...(ne ?? english('ne')), locale } : english(locale);
  }, [locale, wantsNepali, ne]);
  return <PunjiLocaleProvider {...(pack ? { locale: pack } : {})}>{children}</PunjiLocaleProvider>;
}
