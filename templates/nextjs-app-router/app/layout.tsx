import type { ReactNode } from 'react';
// The package stylesheet, once, in the root layout (a Server Component).
import '@punji/ui/styles.css';
import './globals.css';

export const metadata = { title: 'Portfolio dashboard: a Punji UI starter' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme and data-pu-density drive every Punji component through CSS variables; Preferences changes them.
    <html lang="en" data-theme="light" data-pu-density="comfortable">
      <body>{children}</body>
    </html>
  );
}
