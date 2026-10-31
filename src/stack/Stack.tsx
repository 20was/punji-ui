/**
 * Stack and Cluster: the two layout primitives most screens are made of.
 * Stack puts its children in one column; Cluster puts them in a row that wraps
 * onto the next line when it runs out of room. Both space their children with
 * the --pu-space-* scale, so a gap is a number from the scale, never a pixel
 * value. They draw nothing else: no colour, border or padding.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/** A step of the --pu-space-* scale: 1 is 0.25rem, 2 is 0.5rem, 3 is 0.75rem, 4 is 1rem, 16 is 4rem. */
export type SpaceStep = 1 | 2 | 3 | 4 | 16;

/** The elements a Stack can be: a plain div, a landmark or section, a list (with its list styling removed), or a fieldset (with its border and padding removed). */
export type StackElement = 'div' | 'section' | 'article' | 'aside' | 'nav' | 'header' | 'footer' | 'ul' | 'ol' | 'li' | 'fieldset';
/** The elements a Cluster can be: a plain div, a landmark or section, or a list (with its list styling removed). */
export type ClusterElement = 'div' | 'section' | 'nav' | 'header' | 'footer' | 'ul' | 'ol' | 'li';

type LayoutProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** What the group holds. */
  children?: ReactNode;
  /** The space between children, a step of the --pu-space-* scale. Default 3 (0.75rem). */
  gap?: SpaceStep;
  /** Becomes data-testid on the element. */
  testId?: string;
};

export interface StackProps extends LayoutProps {
  /** The element. Default div. Use ul or ol with li children for a list, nav or section for a landmark (name it with aria-label). */
  as?: StackElement;
  /** Where children sit across the column: stretch (default, full width), start, center or end. */
  align?: 'stretch' | 'start' | 'center' | 'end';
}

export interface ClusterProps extends LayoutProps {
  /** The element. Default div. Use ul or ol with li children for a list, nav or section for a landmark (name it with aria-label). */
  as?: ClusterElement;
  /** How a row shares its free space along the row: start (default), center, end or between (the first child at one end, the last at the other). */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** How children line up within a row: center (default), start, end, baseline (text lines up) or stretch (equal height). */
  align?: 'center' | 'start' | 'end' | 'baseline' | 'stretch';
}

/** One column of children, spaced by `gap`. Paragraphs directly inside have no margin of their own, so the gap is the only space. */
export function Stack({ as: Tag = 'div', gap = 3, align = 'stretch', testId, className, children, ...rest }: StackProps) {
  return (
    <Tag {...(rest as object)} className={`pu-stack${className ? ` ${className}` : ''}`} data-gap={gap} data-align={align === 'stretch' ? undefined : align} data-testid={testId}>
      {children}
    </Tag>
  );
}

/** A row of children that wraps onto the next line when it is full, spaced by `gap` in both directions. */
export function Cluster({ as: Tag = 'div', gap = 3, justify = 'start', align = 'center', testId, className, children, ...rest }: ClusterProps) {
  return (
    <Tag
      {...(rest as object)}
      className={`pu-cluster${className ? ` ${className}` : ''}`}
      data-gap={gap}
      data-justify={justify === 'start' ? undefined : justify}
      data-align={align === 'center' ? undefined : align}
      data-testid={testId}
    >
      {children}
    </Tag>
  );
}
