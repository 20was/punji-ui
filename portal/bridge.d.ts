/** Public surface of the existing portal blocks used by package-owned pages. */
declare module '@punji/portal-parts' {
  import type { ReactNode } from 'react';
  export function Page(props: { path: string; lead: ReactNode; children: ReactNode }): ReactNode;
  export function Section(props: { id: string; title: string; children: ReactNode }): ReactNode;
  export function Demo(props: { children: ReactNode; title?: string; code?: string; ground?: boolean; layout?: 'col' | 'row' | 'grid' }): ReactNode;
  export function RefTable(props: { label: string; head: string[]; rows: ReactNode[][] }): ReactNode;
}
