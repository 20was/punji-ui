// Your own words win: the provider's `messages` merge over the pack, and a component's `labels` win over both.
import type { ReactNode } from 'react';
import { PunjiLocaleProvider } from '@punji/ui/locale';
import { bn } from '@punji/ui/locale/bn';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PunjiLocaleProvider locale={bn} messages={{ transferReview: { confirm: 'টাকা পাঠান' } }}>
      {children}
    </PunjiLocaleProvider>
  );
}
