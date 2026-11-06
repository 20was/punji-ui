'use client';
/**
 * The link adapter (hand-written, not synced). The kit has no router
 * dependency: a component that takes `href` renders a plain <a>, or, for an
 * in-app path, the link element you give it: its `linkComponent` prop, else
 * the nearest `LinkProvider` (src/link/Link.tsx). Wrap your router's link once:
 *
 *   const RouterLink: LinkComponent = ({ href, ...rest }) => <Link to={href} {...rest} />;
 *   <LinkProvider component={RouterLink}>...</LinkProvider>
 *
 * Absolute http(s), mailto and tel addresses always render a plain <a>.
 */
import { createElement } from 'react';
import type { AnchorHTMLAttributes, ComponentType, Ref } from 'react';

import { useLinkComponent } from '../link/Link.tsx';
import { safeHref } from '../link/safeHref.ts';

/** Props a link component receives: an anchor's attributes with `href` set, and a `ref` (React 19: a ref is a prop). */
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The address, already passed through `safeHref`. An in-app path for a router link. */
  href: string;
  /** Becomes data-testid on the link. */
  'data-testid'?: string;
  /** React 19: a ref is a prop. Pass it to the element the link renders. */
  ref?: Ref<HTMLAnchorElement>;
}

/** A component that renders a link, such as a wrapped router link. */
export type LinkComponent = ComponentType<LinkProps>;

/** True for a path the app routes itself: no scheme, not `//host`. */
const isInApp = (href: string) => !/^\s*(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);

/** `rel` with noopener and noreferrer added for a new tab. */
const relFor = (target: string | undefined, rel: string | undefined) => {
  if (target !== '_blank') return rel;
  return [...new Set([...(rel?.split(/\s+/) ?? []), 'noopener', 'noreferrer'].filter(Boolean))].join(' ');
};

type AppLinkProps = Omit<LinkProps, 'href'> & {
  href: string;
  /** The component's own `linkComponent` prop: it wins over the provider. */
  linkComponent?: LinkComponent;
  /** Force a plain <a> (another site). */
  external?: boolean;
};

/**
 * What every href-rendering component draws: the explicit link component,
 * else the provider's, else a plain <a>. A blocked `href` (safeHref) renders
 * an <a> without `href` and with aria-disabled, so nothing can navigate.
 */
export function AppLink({ href, linkComponent, external, target, rel, ...rest }: AppLinkProps) {
  const fromContext = useLinkComponent();
  const safe = safeHref(href);
  const relValue = relFor(target, rel);
  if (safe === undefined) return createElement('a', { ...rest, target, rel: relValue, 'aria-disabled': true });
  const custom = !external && isInApp(safe) ? (linkComponent ?? fromContext) : undefined;
  return createElement(custom ?? 'a', { ...rest, href: safe, target, rel: relValue });
}
