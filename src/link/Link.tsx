'use client';
/**
 * Link (design.punji.app/get-started/router): tell the kit once how your app
 * renders an in-app link. Every component that takes an `href` (Button,
 * CardLink, StatusPill, CheckRow, ValueRow, LinkTable, PageHeader) then uses
 * your router's link without a `linkComponent` prop on each one.
 *
 * Order: the component's own `linkComponent` prop, then the nearest
 * `LinkProvider`, then a plain <a>. Absolute http(s), mailto and tel
 * addresses are always a plain <a>. Every `href` passes `safeHref` first.
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { LinkComponent } from '../internal/link.tsx';
import { safeHref } from './safeHref.ts';

export type { LinkComponent, LinkProps } from '../internal/link.tsx';
export { safeHref };

const LinkContext = createContext<LinkComponent | undefined>(undefined);

export interface LinkProviderProps {
  /** Your router's link, wrapped once. It receives `href` (a path), `className`, `children`, `target`, `rel`, aria-* attributes, `onClick` and a `ref`. */
  component: LinkComponent;
  /** The part of your app that uses the link. */
  children: ReactNode;
}

/** Sets the link element for every in-app `href` below it. A component's own `linkComponent` prop still wins. */
export function LinkProvider({ component, children }: LinkProviderProps) {
  return <LinkContext value={component}>{children}</LinkContext>;
}

/** The link component of the nearest `LinkProvider`, or `undefined` for a plain <a>. */
export function useLinkComponent(): LinkComponent | undefined {
  return useContext(LinkContext);
}
