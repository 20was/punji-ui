import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button, CardLink, CheckRow, LinkProvider, LinkTable, LinkTableRow, PageHeader, StatusPill, ValueRow, safeHref } from '../src/index.ts';
import type { LinkComponent } from '../src/index.ts';
import { AppLink } from '../src/internal/link.tsx';

afterEach(() => vi.restoreAllMocks());

const Routed: LinkComponent = ({ href, children, ...rest }) => <a {...rest} href={href} data-routed="yes">{children}</a>;
const Other: LinkComponent = ({ href, children, ...rest }) => <a {...rest} href={href} data-routed="other">{children}</a>;
const WithRef: LinkComponent = ({ href, children, ref, ...rest }) => <a ref={ref} href={href} {...rest}>{children}</a>;
const find = () => screen.queryByText('Go', { exact: false })?.closest('a') ?? screen.getByLabelText('Go');

function Probe({ forwardRef }: { forwardRef: Ref<HTMLAnchorElement> }) {
  return <AppLink href="/a" ref={forwardRef}>x</AppLink>;
}

describe('safeHref', () => {
  it('allows relative paths, fragments, queries, http(s), mailto and tel', () => {
    for (const ok of ['/a/b', 'a/b', './x', '../x', '#top', '?q=1', '//cdn.example.com/x', 'https://example.com', 'HTTP://example.com', 'mailto:a@b.com', 'tel:+9779800000000', '/path:with:colons']) {
      expect(safeHref(ok)).toBe(ok);
    }
  });

  it('blocks javascript, vbscript, data and other schemes, also disguised', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', '  javascript:alert(1)', 'java\nscript:alert(1)', 'java\tscript:alert(1)', '\u0001javascript:alert(1)', 'vbscript:x', 'data:text/html,<b>x</b>', 'file:///etc/passwd', 'blob:https://x/y']) {
      expect(safeHref(bad)).toBeUndefined();
    }
  });

  it('gives undefined for empty and non-string values', () => {
    expect(safeHref('')).toBeUndefined();
    expect(safeHref('   ')).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
  });

  it('warns in development without echoing the address', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    safeHref('javascript:secret()');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('secret');
  });
});

describe('LinkProvider', () => {
  const cases: [string, () => ReactElement][] = [
    ['Button', () => <Button href="/a">Go</Button>],
    ['CardLink', () => <CardLink href="/a">Go</CardLink>],
    ['StatusPill', () => <StatusPill href="/a">Go</StatusPill>],
    ['CheckRow', () => <ul><CheckRow icon={null} title="Go" href="/a" /></ul>],
    ['ValueRow', () => <ValueRow title="Go" href="/a" />],
    ['LinkTable', () => <LinkTable label="L" columns={[{ key: 'a', label: 'A', track: '1fr' }]}><LinkTableRow cells={['Go']} href="/a" /></LinkTable>],
    ['PageHeader', () => <PageHeader title="T" backTo="/a" backLabel="Go" />],
  ];

  it.each(cases)('routes %s through the provider', (_name, make) => {
    render(<LinkProvider component={Routed}>{make()}</LinkProvider>);
    const link = find();
    expect(link.getAttribute('data-routed')).toBe('yes');
    expect(link.getAttribute('href')).toBe('/a');
  });

  it.each(cases)('renders a plain <a> for %s without a provider', (_name, make) => {
    render(make());
    const link = find();
    expect(link.getAttribute('data-routed')).toBeNull();
    expect(link.getAttribute('href')).toBe('/a');
  });

  it('lets the explicit linkComponent prop win over the provider', () => {
    render(
      <LinkProvider component={Routed}>
        <Button href="/a" linkComponent={Other}>Go</Button>
        <PageHeader title="T" backTo="/b" linkComponent={Other} />
      </LinkProvider>,
    );
    expect(screen.getByText('Go').closest('a')?.getAttribute('data-routed')).toBe('other');
    expect(screen.getByTestId('back-button').getAttribute('data-routed')).toBe('other');
  });

  it('uses the nearest provider', () => {
    render(
      <LinkProvider component={Routed}>
        <LinkProvider component={Other}><Button href="/a">Go</Button></LinkProvider>
      </LinkProvider>,
    );
    expect(screen.getByText('Go').closest('a')?.getAttribute('data-routed')).toBe('other');
  });

  it('keeps absolute, mailto and tel addresses on a plain <a>', () => {
    render(
      <LinkProvider component={Routed}>
        <CardLink href="https://example.com">Site</CardLink>
        <Button href="mailto:a@b.com">Mail</Button>
        <StatusPill href="tel:+977">Call</StatusPill>
        <ul><CheckRow icon={null} title="Row" href="/a" external /></ul>
      </LinkProvider>,
    );
    for (const text of ['Site', 'Mail', 'Call', 'Row']) expect(screen.getByText(text, { exact: false }).closest('a')?.getAttribute('data-routed')).toBeNull();
  });

  it('gives an external target=_blank link rel="noopener noreferrer", through the provider too', () => {
    render(
      <LinkProvider component={Routed}>
        <Button href="https://example.com">Out</Button>
        <ul><CheckRow icon={null} title="Row" href="/in" target="_blank" /></ul>
      </LinkProvider>,
    );
    expect(screen.getByText('Out', { exact: false }).closest('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    const row = screen.getByText('Row').closest('a');
    expect(row?.getAttribute('data-routed')).toBe('yes');
    expect(row?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('passes a ref to the link component (React 19 ref as a prop)', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(<LinkProvider component={WithRef}><Probe forwardRef={ref} /></LinkProvider>);
    expect(ref.current?.tagName).toBe('A');
  });

  it('renders a blocked href without href and aria-disabled, and never calls the link component', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const spy = vi.fn<LinkComponent>(() => null);
    render(
      <LinkProvider component={spy}>
        <Button href="javascript:alert(1)">Bad</Button>
        <CardLink href="data:text/html,x">Data</CardLink>
        <StatusPill href=" vbscript:x">Vb</StatusPill>
      </LinkProvider>,
    );
    expect(spy).not.toHaveBeenCalled();
    for (const text of ['Bad', 'Data', 'Vb']) {
      const a = screen.getByText(text, { exact: false }).closest('a');
      expect(a).not.toBeNull();
      expect(a?.hasAttribute('href')).toBe(false);
      expect(a?.getAttribute('aria-disabled')).toBe('true');
    }
  });
});
