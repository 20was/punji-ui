import type { ComponentType } from 'react';

// One source for both halves of every example: the module renders the preview
// and its raw text is the code shown and copied. They cannot drift because
// they are the same file.
const components = import.meta.glob<{ default: ComponentType }>('../examples/*/*.tsx', { eager: true });
// Guide code is only ever read as text (never imported), so a file may do what a real app's entry file does.
const guideSources = import.meta.glob<string>('../guides/*/*.tsx', { eager: true, query: '?raw', import: 'default' });
const sources = import.meta.glob<string>('../examples/*/*.tsx', { eager: true, query: '?raw', import: 'default' });

export interface LoadedExample {
  Component: ComponentType;
  source: string;
}

export function loadExample(slug: string, id: string): LoadedExample | undefined {
  const path = `../examples/${slug}/${id}.tsx`;
  const module = components[path];
  const source = sources[path];
  return module && source !== undefined ? { Component: module.default, source } : undefined;
}

/** The text of a guide's code file (site/src/guides/<slug>/<file>.tsx). */
export function exampleSource(slug: string, file: string): string | undefined {
  return guideSources[`../guides/${slug}/${file}.tsx`];
}

// Showcase patterns keep their layout CSS next to the screen (site/src/examples/<slug>/screen.css). The screen imports
// it, so it is bundled like any CSS; its text is shown beside the TSX so a copy carries both halves.
const styles = import.meta.glob<string>('../examples/*/*.css', { eager: true, query: '?raw', import: 'default' });

/** The text of an example's CSS file (site/src/examples/<slug>/<id>.css), if it has one. */
export function exampleCss(slug: string, id: string): string | undefined {
  return styles[`../examples/${slug}/${id}.css`];
}
