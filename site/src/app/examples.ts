import type { ComponentType } from 'react';

// One source for both halves of every example: the module renders the preview
// and its raw text is the code shown and copied. They cannot drift because
// they are the same file.
const components = import.meta.glob<{ default: ComponentType }>('../examples/*/*.tsx', { eager: true });
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
