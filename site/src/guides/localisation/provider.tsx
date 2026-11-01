// app/providers.tsx: one provider at the root gives every Punji component its words.
'use client';
import type { ReactNode } from 'react';
import { PunjiLocaleProvider } from '@punji/ui/locale';
import { ne } from '@punji/ui/locale/ne';

export function Providers({ children }: { children: ReactNode }) {
  return <PunjiLocaleProvider locale={ne}>{children}</PunjiLocaleProvider>;
}
