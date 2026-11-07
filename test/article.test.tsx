import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Callout, CaveatList, Faq, KeyFacts, LinkProvider, OutlineTile, PromptCard, Sources, StepFlow, TableOfContents, Timeline, extractToc, faqJsonLd, serializeJsonLd } from '../src/index.ts';
import type { FaqChange, FaqItem, LinkComponent } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('Callout', () => {
  it('names every tone in words, has an icon, and is a note region, not a landmark', () => {
    const tones = ['neutral', 'info', 'accent', 'warn', 'danger'] as const;
    const { container } = render(
      <>
        {tones.map((tone) => (
          <Callout key={tone} tone={tone} testId={tone}>
            Body for {tone}
          </Callout>
        ))}
      </>,
    );
    const words = ['Note', 'Information', 'Tip', 'Warning', 'Important'];
    tones.forEach((tone, i) => {
      const note = screen.getByTestId(tone);
      expect(note.getAttribute('role')).toBe('note');
      expect(within(note).getByText(words[i]!)).toBeTruthy();
      expect(note.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });
    expect(screen.getAllByRole('note').length).toBe(5);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.querySelectorAll('[data-tone]').length).toBe(5);
  });

  it('takes a label, labels and an icon, and has no serious axe violations', async () => {
    const { container } = render(
      <>
        <Callout tone="warn" label="Proposed, not law" icon={<span data-testid="mine" aria-hidden="true" />}>
          The rate is a plan.
        </Callout>
        <Callout tone="danger" labels={{ danger: 'Cuidado' }}>
          x
        </Callout>
      </>,
    );
    expect(screen.getByRole('note', { name: 'Proposed, not law' })).toBeTruthy();
    expect(screen.getByRole('note', { name: 'Cuidado' })).toBeTruthy();
    expect(screen.getByTestId('mine')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('KeyFacts, StepFlow, Timeline', () => {
  it('KeyFacts is a definition list with notes', async () => {
    const { container } = render(<KeyFacts heading="At a glance" facts={[{ label: 'Status', value: 'Proposed', note: 'not in force' }, { label: 'Applies to', value: 'Individuals' }]} />);
    expect(screen.getByRole('group', { name: 'At a glance' })).toBeTruthy();
    expect(container.querySelectorAll('dt').length).toBe(2);
    expect(container.querySelector('dd')?.textContent).toBe('Proposednot in force');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('StepFlow is an ordered list in reading order', async () => {
    const { container } = render(<StepFlow label="How it works" steps={[{ title: 'Borrow', detail: 'Take the loan' }, { title: 'Buy' }, { title: 'Repay', detail: 'With interest' }]} />);
    const list = screen.getByRole('list', { name: 'How it works' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)).toEqual(['Borrow', 'Buy', 'Repay']);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('Timeline prints an ISO day in BS and AD in a <time>, and any other date as stated', async () => {
    const { container } = render(
      <Timeline
        label="Plan"
        milestones={[
          { date: '2025-10-29', tag: 'Now', items: ['Rule one', 'Rule two'] },
          { date: 'Mid-2026', tag: 'Proposed', items: ['Rule three'] },
        ]}
      />,
    );
    const time = container.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2025-10-29');
    expect(time.textContent).toMatch(/2082 BS/);
    expect(time.textContent).toMatch(/29 Oct 2025 AD/);
    expect(time.textContent!.indexOf('BS')).toBeLessThan(time.textContent!.indexOf('AD'));
    expect(screen.getByText('Mid-2026').tagName).toBe('SPAN');
    expect(container.querySelectorAll('time').length).toBe(1);
    expect(screen.getByRole('list', { name: 'Plan' }).tagName).toBe('OL');
    expect(screen.getByText('Proposed')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('Timeline can lead with AD and use its own words', () => {
    const { container } = render(<Timeline primary="ad" labels={{ ad: 'CE', bs: 'VS' }} milestones={[{ date: '2025-10-29', items: ['x'] }]} />);
    expect(container.querySelector('time')!.textContent).toMatch(/^29 Oct 2025 CE.*VS/);
  });
});

const Router: LinkComponent = ({ href, children, ...rest }) => (
  <a data-router="yes" href={`/app${href}`} {...rest}>
    {children}
  </a>
);

describe('Sources', () => {
  const items = [
    { url: 'https://example.org/report', label: 'Annual report', publisher: 'The Regulator', date: '12 Jan 2026' },
    { url: '/learn/other', label: 'Other guide', publisher: 'Us' },
    { url: 'javascript:alert(1)', label: 'Bad', publisher: 'X' },
  ];

  it('has a heading of the chosen level, new-tab semantics only for other sites, and blocks unsafe schemes', async () => {
    const { container } = render(<Sources items={items} headingLevel={3} />);
    expect(screen.getByRole('heading', { name: 'Sources', level: 3 })).toBeTruthy();
    const external = screen.getByRole('link', { name: /Annual report/ });
    expect(external.getAttribute('target')).toBe('_blank');
    expect(external.getAttribute('rel')).toBe('noopener noreferrer');
    expect(external.textContent).toContain('(opens in a new tab)');
    expect(screen.getByText('The Regulator, 12 Jan 2026')).toBeTruthy();
    expect(screen.getByText('Us')).toBeTruthy();
    const internal = screen.getByRole('link', { name: 'Other guide' });
    expect(internal.getAttribute('target')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Bad' })).toBeNull();
    expect(screen.getByText('Bad').getAttribute('href')).toBeNull();
    expect(screen.getByText('Bad').getAttribute('aria-disabled')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('uses the LinkProvider for in-app urls and a plain anchor for other sites', () => {
    render(
      <LinkProvider component={Router}>
        <Sources items={items.slice(0, 2)} />
      </LinkProvider>,
    );
    expect(screen.getByRole('link', { name: 'Other guide' }).getAttribute('data-router')).toBe('yes');
    expect(screen.getByRole('link', { name: /Annual report/ }).getAttribute('data-router')).toBeNull();
  });
});

describe('CaveatList', () => {
  it('is a section with a heading, notes, facts and a closing line', async () => {
    const { container } = render(<CaveatList title="Before you trust this" notes={['Backtests are past results.', 'Fees are not included.']} facts={[{ label: 'Data as of', value: '2026-11-06' }]} foot="Not advice." headingLevel={3} testId="cav" />);
    expect(screen.getByRole('heading', { name: 'Before you trust this', level: 3 })).toBeTruthy();
    expect(within(screen.getByTestId('cav-notes')).getAllByRole('listitem').length).toBe(2);
    expect(screen.getByTestId('cav-facts').querySelector('dt')?.textContent).toBe('Data as of');
    expect(screen.getByTestId('cav-foot').textContent).toBe('Not advice.');
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('extractToc', () => {
  it('adds ids to h2s, keeps an existing id and de-duplicates repeats', () => {
    const { toc, content } = extractToc([<h2 key="a">What is <strong>NEPSE</strong>?</h2>, <p key="p">text</p>, <h2 key="b">Rules</h2>, <h2 key="c">Rules</h2>, <h2 key="d" id="mine">Own id</h2>]);
    expect(toc).toEqual([
      { id: 'what-is-nepse', label: 'What is NEPSE?', level: 2 },
      { id: 'rules', label: 'Rules', level: 2 },
      { id: 'rules-2', label: 'Rules', level: 2 },
      { id: 'mine', label: 'Own id', level: 2 },
    ]);
    const html = renderToString(<>{content}</>);
    expect(html).toContain('<h2 id="what-is-nepse">');
    expect(html).toContain('<h2 id="rules-2">');
    expect(html).toContain('<h2 id="mine">');
  });

  it('can read h3s too', () => {
    const { toc } = extractToc([<h2 key="a">A</h2>, <h3 key="b">B</h3>], ['h2', 'h3']);
    expect(toc.map((e) => e.level)).toEqual([2, 3]);
  });
});

describe('TableOfContents', () => {
  const entries = [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }, { id: 'three', label: 'Three', level: 3 }];

  it('is a named nav of fragment links, with no current section on the server', () => {
    const html = renderToString(<TableOfContents entries={entries} />);
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('href="#one"');
    expect(html).not.toContain('aria-current');
    render(<TableOfContents entries={entries} />);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeTruthy();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#one', '#two', '#three']);
  });

  it('marks the chosen link aria-current, controlled or not, and reports changes', async () => {
    const user = userEvent.setup();
    const onCurrentChange = vi.fn<(id: string | null) => void>();
    render(<TableOfContents entries={entries} onCurrentChange={onCurrentChange} labels={{ title: 'Contents' }} />);
    await user.click(screen.getByRole('link', { name: 'Two' }));
    expect(screen.getByRole('link', { name: 'Two' }).getAttribute('aria-current')).toBe('location');
    expect(screen.getByRole('link', { name: 'One' }).getAttribute('aria-current')).toBeNull();
    expect(onCurrentChange).toHaveBeenCalledWith('two');
    expect(screen.getByRole('navigation', { name: 'Contents' })).toBeTruthy();
  });

  it('follows the section the IntersectionObserver reports, and keeps the last one when none is visible', () => {
    const calls: IntersectionObserverCallback[] = [];
    const observed: string[] = [];
    const disconnect = vi.fn<() => void>();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: IntersectionObserverCallback) {
        calls.push(cb);
      }
      observe(el: Element) {
        observed.push(el.id);
      }
      disconnect = disconnect;
    });
    const { unmount } = render(
      <>
        <TableOfContents entries={entries} />
        <h2 id="one">One</h2>
        <h2 id="two">Two</h2>
        <h2 id="three">Three</h2>
      </>,
    );
    expect(observed).toEqual(['one', 'two', 'three']);
    const hit = (id: string, isIntersecting: boolean) => act(() => calls.at(-1)!([{ target: document.getElementById(id)!, isIntersecting } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
    hit('one', true);
    expect(screen.getAllByRole('link')[0]!.getAttribute('aria-current')).toBe('location');
    hit('two', true);
    hit('one', false);
    expect(screen.getAllByRole('link')[1]!.getAttribute('aria-current')).toBe('location');
    hit('two', false);
    expect(screen.getAllByRole('link')[1]!.getAttribute('aria-current')).toBe('location');
    expect(document.querySelectorAll('[aria-current]').length).toBe(1);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('without IntersectionObserver it still works from the address hash', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    window.location.hash = '#two';
    render(<TableOfContents entries={entries} />);
    expect(screen.getByRole('link', { name: 'Two' }).getAttribute('aria-current')).toBe('location');
    act(() => {
      window.location.hash = '#one';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('link', { name: 'One' }).getAttribute('aria-current')).toBe('location');
  });

  it('can be controlled', () => {
    const { rerender } = render(<TableOfContents entries={entries} current="one" />);
    expect(screen.getByRole('link', { name: 'One' }).getAttribute('aria-current')).toBe('location');
    rerender(<TableOfContents entries={entries} current="two" />);
    expect(screen.getByRole('link', { name: 'Two' }).getAttribute('aria-current')).toBe('location');
  });

  it('reads the headings of a scope when no entries are given, skipping ones without ids', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(
      <>
        <TableOfContents scope="#doc" levels={[2, 3]} />
        <article id="doc">
          <h2 id="a">Alpha</h2>
          <h3 id="b">Beta</h3>
          <h2>No id</h2>
        </article>
      </>,
    );
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Alpha', 'Beta']);
  });

  it('renders nothing below minEntries and has no serious axe violations', async () => {
    const { container, rerender } = render(<TableOfContents entries={entries.slice(0, 1)} minEntries={2} />);
    expect(container.firstChild).toBeNull();
    rerender(<TableOfContents entries={entries} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Faq', () => {
  const items: FaqItem[] = [
    { q: 'What is it?', a: 'A thing.' },
    { q: 'Is it free?', a: <p>Yes, <b>free</b>.</p>, aText: 'Yes, free.' },
    { id: 'safe', q: 'Is it <safe>?', a: 'Yes.' },
  ];

  it('is a section with a title, question buttons in headings one level below, and the first answer open', async () => {
    const { container } = render(<Faq title="Questions" eyebrow="Help" items={items} testId="faq" />);
    expect(screen.getByRole('region', { name: 'Questions' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Questions', level: 2 })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBe(3);
    expect(screen.getByRole('button', { name: 'What is it?' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Is it free?' }).getAttribute('aria-expanded')).toBe('false');
    // Closed answers stay in the page, hidden.
    expect(container.textContent).toContain('Yes, free.');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('opens one at a time by default and reports the change for analytics', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: string[], change: FaqChange) => void>();
    render(<Faq title="Questions" items={items} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'Is it free?' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['2'], { id: '2', index: 1, open: true });
    expect(screen.getByRole('button', { name: 'What is it?' }).getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Is it free?' }));
    expect(onValueChange).toHaveBeenLastCalledWith([], { id: '2', index: 1, open: false });
  });

  it('supports defaultValue [], type multiple and headingLevel', async () => {
    const user = userEvent.setup();
    render(<Faq title="Questions" items={items} defaultValue={[]} type="multiple" headingLevel={3} />);
    expect(screen.getByRole('heading', { name: 'Questions', level: 3 })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 4 }).length).toBe(3);
    await user.click(screen.getByRole('button', { name: 'What is it?' }));
    await user.click(screen.getByRole('button', { name: 'Is it free?' }));
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('aria-expanded') === 'true').length).toBe(2);
  });
});

describe('faqJsonLd', () => {
  it('returns FAQPage data from plain text, preferring qText and aText', () => {
    const data = faqJsonLd([
      { q: 'What is it?', a: 'A  thing.\n' },
      { q: <b>Is it free?</b>, qText: 'Is it free?', a: <p>Yes.</p>, aText: 'Yes, free.' },
    ]);
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What is it?', acceptedAnswer: { '@type': 'Answer', text: 'A thing.' } },
        { '@type': 'Question', name: 'Is it free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, free.' } },
      ],
    });
  });

  it('skips items with no plain text and returns null when none is left', () => {
    expect(faqJsonLd([{ q: <b>x</b>, a: 'y' }, { q: 'ok', a: <i>z</i> }])).toBeNull();
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ q: <b>x</b>, a: 'y' }, { q: 'Q', a: 'A' }])?.mainEntity.length).toBe(1);
  });

  it('serializes safely for a script tag', () => {
    const data = faqJsonLd([{ q: 'Is </script> ok & <b>?', a: 'Line\u2028sep' }]);
    const json = serializeJsonLd(data);
    expect(json).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(json)).toEqual(data);
  });
});

describe('PromptCard and OutlineTile', () => {
  it('is a section with an eyebrow, a headline of the chosen level, a line and actions', async () => {
    const { container } = render(
      <>
        <PromptCard eyebrow="Watchlist" title="Add your first stock" body="We will show its price here." actions={<button type="button">Add a stock</button>} headingLevel={1} />
        <OutlineTile title="Your gain and loss" body="Shown once you add a stock." drawing={<path d="M0 50 L60 30 L120 40 L200 8" />} testId="tile" />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Add your first stock', level: 1 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a stock' })).toBeTruthy();
    expect(screen.getByText('Watchlist')).toBeTruthy();
    const tile = screen.getByTestId('tile');
    expect(tile.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(tile.textContent).toBe('Your gain and lossShown once you add a stock.');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('defaults to an h2 and omits what is not given', () => {
    render(<PromptCard title="Nothing here" testId="p" />);
    expect(screen.getByRole('heading', { name: 'Nothing here', level: 2 })).toBeTruthy();
    expect(screen.getByTestId('p').children.length).toBe(1);
  });
});
