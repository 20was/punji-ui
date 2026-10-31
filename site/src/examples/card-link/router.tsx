import { Card } from '@punji/ui/card';
import { CardLink } from '@punji/ui/card-link';
import type { LinkComponent } from '@punji/ui';

// Wrap your router's link once. `href` stays a path; this stand-in only stops the browser navigating.
const RouterLink: LinkComponent = ({ href, onClick, children, ...rest }) => (
  <a
    href={href}
    {...rest}
    onClick={(event) => {
      event.preventDefault();
      onClick?.(event);
    }}
  >
    {children}
  </a>
);

export default function Example() {
  return (
    <Card
      title="Watchlist"
      action={
        <CardLink href="/stock/NABIL" linkComponent={RouterLink} ariaLabel="Stock page: NABIL">
          Stock page
        </CardLink>
      }
    >
      <p>ariaLabel gives a fuller name; it must contain the visible words.</p>
      <p>
        <CardLink href="https://example.com" external ariaLabel="Example site, external">
          Example site
        </CardLink>{' '}
        forces an external link.
      </p>
    </Card>
  );
}
