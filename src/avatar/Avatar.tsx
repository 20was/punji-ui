/**
 * Avatar (design.punji.app/components/avatar): a person's initials in a
 * circle, for an account line, a person in a list, or the account button in
 * a top bar. Never a photo (Punji keeps none). The initials come from the
 * name (first and last word) or, with no name, the first letter of the
 * email. Decorative by default (the name is written beside it); `label`
 * names it when it stands alone. `loading` draws the circle as a skeleton
 * of the same size, so nothing moves when the name arrives.
 */

export type AvatarSize = 'sm' | 'md' | 'lg';

/** The initials an Avatar draws: first and last word of the name, else the email's first letter, else "?". */
export function avatarInitials(name: string | null | undefined, email?: string | null): string {
  const n = (name ?? '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const first = [...parts[0]!][0] ?? '';
    const last = parts.length > 1 ? ([...parts[parts.length - 1]!][0] ?? '') : '';
    return (first + last).toUpperCase();
  }
  const e = (email ?? '').trim();
  return e ? ([...e][0] ?? '?').toUpperCase() : '?';
}

export function Avatar({
  name,
  email,
  size = 'md',
  tone = 'neutral',
  loading = false,
  label,
  testId,
  className,
}: {
  /** The person's name; the first and last word give the initials. */
  name?: string | null;
  /** Used for the first letter when there is no name. */
  email?: string | null;
  /** sm 32, md 40 (a row), lg 56 (the account line). */
  size?: AvatarSize;
  /** neutral on a card; accent for the one account button in a bar. */
  tone?: 'neutral' | 'accent';
  /** Draws a skeleton circle of the same size while the name loads. */
  loading?: boolean;
  /** Names the avatar when no name is written beside it. */
  label?: string;
  /** Becomes data-testid on the circle. */
  testId?: string;
  /** Layout only (margin, flex), never a restyle. */
  className?: string;
}) {
  const cls = `kit-avatar ${size}${tone === 'accent' ? ' accent' : ''}${loading ? ' loading' : ''}${className ? ` ${className}` : ''}`;
  if (loading) return <span className={cls} aria-hidden="true" data-testid={testId} />;
  return (
    <span className={cls} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-testid={testId}>
      {avatarInitials(name, email)}
    </span>
  );
}
