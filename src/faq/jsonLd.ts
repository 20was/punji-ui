/**
 * faqJsonLd (design.punji.app/components/faq): FAQPage structured data for the items a `Faq` shows. Plain
 * functions with no React and no browser APIs, so a server component can call them (they are not in the
 * 'use client' module with Faq).
 */
import type { ReactNode } from 'react';

import type { FaqItem } from './Faq.tsx';

const plain = (text: string | undefined, node: ReactNode) => (text ?? (typeof node === 'string' ? node : '')).replace(/\s+/g, ' ').trim();

/** schema.org FAQPage structured data (https://schema.org/FAQPage). */
export interface FaqJsonLd {
  /** Always `https://schema.org`. */
  '@context': 'https://schema.org';
  /** Always `FAQPage`. */
  '@type': 'FAQPage';
  /** One Question per item that has plain text. */
  mainEntity: { '@type': 'Question'; name: string; acceptedAnswer: { '@type': 'Answer'; text: string } }[];
}

/**
 * The FAQPage JSON-LD for the same items the `Faq` shows, or `null` when no item has plain text for both its
 * question and its answer (`q`/`a` as strings, or `qText`/`aText`). Items without text are skipped, never guessed
 * from markup. Render it yourself:
 * a `<script type="application/ld+json">` whose text is `serializeJsonLd(faqJsonLd(items))` (your framework's way of setting a script's raw text).
 * Mark up only what the page shows: search engines expect every question here to be visible on the page.
 * @stability beta
 */
export function faqJsonLd(items: readonly FaqItem[]): FaqJsonLd | null {
  const mainEntity = items.flatMap((item) => {
    const name = plain(item.qText, item.q);
    const text = plain(item.aText, item.a);
    return name && text ? [{ '@type': 'Question' as const, name, acceptedAnswer: { '@type': 'Answer' as const, text } }] : [];
  });
  return mainEntity.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity } : null;
}

/**
 * JSON for a `<script type="application/ld+json">`: `<`, `>`, `&` and the line separators are escaped so
 * a question containing `</script>` cannot end the tag.
 * @stability beta
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
