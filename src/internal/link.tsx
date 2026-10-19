/**
 * The link adapter (hand-written, not synced). The kit has no router
 * dependency: a component that takes `href` renders a plain <a>, or, for an
 * in-app path, the `linkComponent` you pass. Wrap your router's link once:
 *
 *   const RouterLink: LinkComponent = ({ href, ...rest }) => <Link to={href} {...rest} />;
 *   <Button href="/settings" linkComponent={RouterLink}>Settings</Button>
 *
 * Absolute http(s) URLs always render a plain <a>.
 */
import type { AnchorHTMLAttributes, ComponentType } from 'react';

/** Props a link component receives: an anchor's attributes with `href` set. */
export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; 'data-testid'?: string };

/** A component that renders a link, such as a wrapped router link. */
export type LinkComponent = ComponentType<LinkProps>;
