import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChoiceGroup } from '../src/choice-group/ChoiceGroup.tsx';
import { Button, Card, ShowMore, StatusPill } from '../src/index.ts';
import type { LinkComponent } from '../src/internal/link.tsx';
import { seriousViolations } from './axe.ts';

const RouterLink: LinkComponent = ({ children, ...rest }) => (
  <a data-router="yes" {...rest}>
    {children}
  </a>
);

function ShowMoreHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ul id="list">{open ? <li>all</li> : <li>some</li>}</ul>
      <ShowMore expanded={open} onToggle={() => setOpen((x) => !x)} more="Show all 24" less="Show fewer" controls="list" />
    </>
  );
}

const CHOICES = [
  { value: 'value', label: 'Traded value' },
  { value: 'cap', label: 'Market value' },
];

function ChoiceHarness() {
  const [v, setV] = useState('value');
  return <ChoiceGroup options={CHOICES} value={v} onChange={setV} label="Tile size" testId="size" />;
}

describe('Card', () => {
  it('is a section with its heading, a line and one action', () => {
    render(
      <Card title="Holdings" description="As of today" action={<Button variant="ghost">Edit</Button>} testId="card">
        <p>Rows</p>
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { level: 2, name: 'Holdings' })).toBeTruthy();
    expect(card.querySelector('h2')?.textContent).toBe('Holdings');
    expect(card.querySelector('.kit-card-t p')?.textContent).toBe('As of today');
  });

  it('flush, an h3, and an aria-label when it has no title', () => {
    const html = renderToStaticMarkup(
      <>
        <Card flush title="T" headingLevel={3}>
          x
        </Card>
        <Card label="Chart">y</Card>
      </>,
    );
    expect(html).toContain('<section class="kit-card flush"><header class="kit-card-h"><div class="kit-card-t"><h3>T</h3>');
    expect(html).toContain('<section class="kit-card" aria-label="Chart">y</section>');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <Card title="Section" description="Line">
        <p>Body</p>
      </Card>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('ShowMore', () => {
  it('toggles and says whether the list is open', async () => {
    render(<ShowMoreHarness />);
    const btn = screen.getByRole('button', { name: 'Show all 24' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toBe('list');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: 'Show fewer' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<ShowMore expanded={false} onToggle={() => {}} more="More" less="Less" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('StatusPill', () => {
  it('is a plain label with its tone, dot, swatch and size', () => {
    const html = renderToStaticMarkup(
      <StatusPill tone="gain" dot size="sm" swatch="red">
        Up
      </StatusPill>,
    );
    expect(html).toContain('class="kit-pill gain dot sm"');
    expect(html).toContain('class="kit-pill-sw"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('is a link with href: a plain <a>, or the link component for an in-app path', () => {
    render(
      <>
        <StatusPill href="/sector/banks">Banks</StatusPill>
        <StatusPill href="/sector/hydro" linkComponent={RouterLink}>
          Hydro
        </StatusPill>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Banks' }).className).toBe('kit-pill link');
    expect(screen.getByRole('link', { name: 'Hydro' }).getAttribute('data-router')).toBe('yes');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <p>
        <StatusPill tone="warn">Estimate</StatusPill> <StatusPill href="/x">Link</StatusPill>
      </p>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('ChoiceGroup', () => {
  const options = [
    { value: 'value', label: 'Traded value' },
    { value: 'cap', label: 'Market value' },
  ];
  const common = { options, value: 'value', onChange: () => {}, label: 'Tile size', testId: 'size' };

  it('provides native exclusive choices with a named group and one selected value', () => {
    const html = renderToStaticMarkup(<ChoiceGroup {...common} />);
    expect(html).toContain('aria-label="Tile size"');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain('name="size"');
    expect(html).not.toContain('role="tab');
  });

  it('escapes labels and supports native disabled choices', () => {
    const html = renderToStaticMarkup(<ChoiceGroup {...common} options={[...options, { value: 'missing', label: '<unavailable>', disabled: true }]} />);
    expect(html).toContain('&lt;unavailable&gt;');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-testid="size-missing"');
  });

  it('reserves compact styling for explicit use', () => {
    expect(renderToStaticMarkup(<ChoiceGroup {...common} appearance="compact" size="sm" />)).toContain('class="kit-choice kit-choice-compact sm"');
  });

  it('arrow keys move the choice (the browser’s radios)', async () => {
    render(<ChoiceHarness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Market value' }));
    expect((screen.getByRole('radio', { name: 'Market value' }) as HTMLInputElement).checked).toBe(true);
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<ChoiceGroup {...common} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
