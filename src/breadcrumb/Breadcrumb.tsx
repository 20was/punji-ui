'use client';

/**
 * Breadcrumb (design.punji.app/components/breadcrumb): where the reader is in
 * a hierarchy (Accounts, Savings, Statement), with a link back to each level.
 * The WAI-ARIA Breadcrumb pattern: a <nav> named "Breadcrumb" around an ordered
 * list; the last item is the current page (aria-current="page"); the
 * separators are decorative and hidden from screen readers.
 *
 * Links go through the link adapter: a plain <a>, or your router link from
 * LinkProvider, with `href` passed through safeHref. With `maxItems` the middle
 * levels collapse into a "..." menu (a MenuButton of links) so a deep trail fits
 * a phone; choose `maxItems` from the width you have (the component does not
 * measure).
 */
import { AppLink } from '../internal/link.tsx';
import type { LinkComponent } from '../internal/link.tsx';
import { useLocaleMessages } from '../locale/context.tsx';
import { MenuButton } from '../menu/Menu.tsx';

/** Breadcrumb's words. */
export interface BreadcrumbLabels {
  /** The nav's accessible name. Default "Breadcrumb". */
  nav?: string;
  /** The collapsed levels' menu button. Default "Show hidden levels". */
  more?: string;
}

export interface BreadcrumbItem {
  /** Unique within the trail. */
  id?: string;
  /** The level's name. */
  label: string;
  /** Where it goes. Omit on the last item (the current page) unless it should be a link too. */
  href?: string;
}

export interface BreadcrumbProps {
  /** The trail from the top level down to the current page (the last item). */
  items: readonly BreadcrumbItem[];
  /** Collapse the middle levels into a menu when there are more than this many items (minimum 3). Default: never. */
  maxItems?: number;
  /** Its words; the locale pack's `breadcrumb` namespace is the default. */
  labels?: BreadcrumbLabels;
  /** Link component for in-app `href`s; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the nav. */
  testId?: string;
  /** Extra class names on the nav. */
  className?: string;
}

function Separator() {
  return (
    <span className="pu-breadcrumb-sep pu-flip" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3.5L10.5 8 6 12.5" />
      </svg>
    </span>
  );
}

/**
 * A breadcrumb trail (WAI-ARIA Breadcrumb).
 * @stability beta
 */
export function Breadcrumb({ items, maxItems, labels, linkComponent, testId, className }: BreadcrumbProps) {
  const text = { nav: 'Breadcrumb', more: 'Show hidden levels', ...useLocaleMessages().messages.breadcrumb, ...labels };
  const limit = maxItems === undefined ? Infinity : Math.max(3, maxItems);
  const collapse = items.length > limit;
  // First level, then the menu, then the last (limit - 2) levels.
  const tail = collapse ? limit - 2 : 0;
  const hidden = collapse ? items.slice(1, items.length - tail) : [];
  const shown = collapse ? [items[0]!, ...items.slice(items.length - tail)] : items;
  const last = items.length - 1;
  const entry = (item: BreadcrumbItem, index: number) => {
    const current = items.indexOf(item) === last;
    const key = item.id ?? `${index}-${item.label}`;
    return (
      <li key={key} className="pu-breadcrumb-item">
        {item.href ? (
          <AppLink href={item.href} linkComponent={linkComponent} aria-current={current ? 'page' : undefined}>
            {item.label}
          </AppLink>
        ) : (
          <span aria-current={current ? 'page' : undefined}>{item.label}</span>
        )}
        {current ? null : <Separator />}
      </li>
    );
  };
  return (
    <nav className={`pu-breadcrumb${className ? ` ${className}` : ''}`} aria-label={text.nav} data-testid={testId}>
      <ol>
        {entry(shown[0]!, 0)}
        {collapse ? (
          <li className="pu-breadcrumb-item">
            <MenuButton
              iconOnly
              label={text.more}
              linkComponent={linkComponent}
              className="pu-breadcrumb-more"
              items={hidden.map((h, i) => ({ id: h.id ?? `${i}-${h.label}`, label: h.label, href: h.href, disabled: !h.href }))}
              testId={testId ? `${testId}-more` : undefined}
            />
            <Separator />
          </li>
        ) : null}
        {shown.slice(1).map((item, i) => entry(item, i + 1))}
      </ol>
    </nav>
  );
}
