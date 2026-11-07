import { Callout, CaveatList, KeyFacts, Sources, StepFlow, TableOfContents, Timeline } from '@punji/ui/article';
import { extractToc } from '@punji/ui/article-toc';
import { Faq } from '@punji/ui/faq';
import { faqJsonLd, serializeJsonLd } from '@punji/ui/faq-json-ld';

// A whole explainer: a contents list derived from the h2s (ids are added during render, so a #fragment link works
// before any script runs), the article kit between paragraphs, and the page's FAQ with its JSON-LD. The app renders
// the JSON-LD as a script tag; here it is shown as text so you can see what a crawler would read.
const faqs = [
  { q: 'Is the new rate in force?', a: 'Not yet. It is a proposal until the notice is published.' },
  { q: 'Does it change what I already hold?', a: 'Only sales after the effective date use the new rate.' },
  { q: 'Where do I check?', a: 'The regulator publishes every notice on its website; the sources are listed above.' },
];

export default function Example() {
  const { toc, content } = extractToc([
    <h2 key="what">What is proposed</h2>,
    <p key="p1">The plan changes how a sale of listed shares is taxed. Two things matter to a reader: when it applies, and whether it applies to them today.</p>,
    <Callout key="c" tone="warn" label="Proposed, not in force">
      The 2082 rates still apply. Nothing here changes a sale you make today.
    </Callout>,
    <h2 key="when">When it applies</h2>,
    <Timeline
      key="t"
      label="Plan milestones"
      milestones={[
        { date: '2025-10-29', tag: 'Announced', items: ['The plan is published for comment.'] },
        { date: '2026-07-16', tag: 'Proposed', items: ['New rates would apply to sales on or after this day.', 'Brokers update their systems.'] },
        { date: 'To be decided', items: ['Treatment of shares bought before the date.'] },
      ]}
    />,
    <h2 key="how">How a sale is taxed</h2>,
    <StepFlow
      key="s"
      label="From sale to tax"
      steps={[
        { title: 'You sell', detail: 'The broker records the sale and its date.' },
        { title: 'The holding period is checked', detail: 'Shares held longer than a year are taxed at the lower rate.' },
        { title: 'Tax is deducted', detail: 'The broker deducts it from the proceeds and pays it over.' },
      ]}
    />,
    <h2 key="facts">At a glance</h2>,
    <KeyFacts
      key="k"
      heading="The proposal"
      facts={[
        { label: 'Status', value: 'Proposed', note: 'Not law until published' },
        { label: 'Applies to', value: 'Individuals selling listed shares' },
        { label: 'Earliest date', value: '16 Jul 2026' },
      ]}
    />,
  ]);
  const sources = [
    { url: 'https://example.org/notice-2082', label: 'Public notice on capital gains', publisher: 'The regulator', date: '29 Oct 2025' },
    { url: 'https://example.org/budget-speech', label: 'Budget speech', publisher: 'Ministry of Finance', date: '29 May 2026' },
  ];
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: '70ch' }}>
      <TableOfContents entries={toc} />
      <div style={{ display: 'grid', gap: 16 }}>{content}</div>
      <CaveatList title="Before you trust this" notes={['Rates in this guide are the proposal, not the law.', 'Your own tax depends on how long you held the shares.']} facts={[{ label: 'Checked', value: '6 Nov 2026' }]} foot="This is general information, not advice." headingLevel={2} />
      <Sources items={sources} />
      <Faq title="Questions" items={faqs} />
      <pre style={{ margin: 0, padding: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }} aria-label="FAQPage JSON-LD">{serializeJsonLd(faqJsonLd(faqs))}</pre>
    </div>
  );
}
