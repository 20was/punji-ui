// app/layout.tsx: a server component. Import the stylesheet once, here.
import type { ReactNode } from 'react';
import '@punji/ui/styles.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
