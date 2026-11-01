import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CardLink, CheckList, CheckRow, DistributionBar, FactList, InlineState, KeyStats, LinkTable, LinkTableRow, MeterBar, RangeBar, RetryNote,
  ShareBar, ShareDonut, StatusDisc, StepList, StockLabel, SummaryFigure, SHARE_TONES,
} from '../src/index.ts';
import type { LinkComponent } from '../src/internal/link.tsx';
import { seriousViolations } from './axe.ts';

const RouterLink: LinkComponent = ({ children, ...rest }) => (
  <a data-router="yes" {...rest}>
    {children}
  </a>
);

describe('RetryNote', () => {
  it('is an alert with a real retry button that calls back', async () => {
    const onRetry = vi.fn<() => void>();
    const { container } = render(<RetryNote retryLabel="Try again" onRetry={onRetry} testId="rn">Could not load your holdings.</RetryNote>);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Could not load your holdings.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('rn-retry')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('MeterBar, RangeBar, ShareBar, DistributionBar, ShareDonut', () => {
  it('MeterBar is decorative by default, an img with a label, widths are shares of the whole', () => {
    const { container, rerender } = render(<MeterBar parts={[{ value: 60, tone: 'gain' }, { value: 20, tone: 'loss' }]} max={100} marker={75} />);
    const bar = container.querySelector('.kit-meter') as HTMLElement;
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.className).toContain('marked');
    expect([...bar.querySelectorAll('i')].map((i) => (i as HTMLElement).style.width)).toEqual(['60%', '20%']);
    expect((bar.querySelector('b') as HTMLElement).style.insetInlineStart).toBe('75%');
    rerender(<MeterBar parts={[{ value: 1, tone: 'gain' }]} label="Fees take 1 percent" />);
    expect(screen.getByRole('img', { name: 'Fees take 1 percent' })).toBeTruthy();
  });

  it('MeterBar draws nothing for a zero, negative or non-finite whole instead of NaN', () => {
    const { container } = render(<MeterBar parts={[{ value: Number.NaN, tone: 'gain' }, { value: -5, tone: 'loss' }]} />);
    expect([...container.querySelectorAll('i')].map((i) => (i as HTMLElement).style.width)).toEqual(['0%', '0%']);
  });

  it('RangeBar places marks on the domain and exposes its labels as text when it has no name', () => {
    const { container } = render(
      <RangeBar head={<span>52-week range</span>} domain={[400, 600]} span={[450, 550]} marks={[{ value: 537, kind: 'strong', label: '537' }, { value: 480, kind: 'accent', label: 'Alert at 480' }, { value: 400, kind: 'edge', label: 'Low 400' }]} />,
    );
    expect((container.querySelector('.kit-range-track > b.strong') as HTMLElement).style.insetInlineStart).toBe('68.5%');
    expect(container.querySelector('.kit-range-track > b.edge')).toBeNull();
    expect(container.querySelector('.kit-range-track > i.span')).toBeTruthy();
    const labels = container.querySelector('.kit-range-labels') as HTMLElement;
    expect(labels.getAttribute('aria-hidden')).toBeNull();
    expect(labels.textContent).toContain('Alert at 480');
  });

  it('RangeBar with a label is one img and hides the duplicated labels', () => {
    const { container } = render(<RangeBar domain={[0, 100]} fill={40} marks={[{ value: 85, kind: 'accent', label: 'goal 85' }]} label="40 of 100, goal 85" legend={['0', '50', '100']} />);
    expect(screen.getByRole('img', { name: '40 of 100, goal 85' })).toBeTruthy();
    expect(container.querySelector('.kit-range-legend')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('RangeBar with a single value or no values does not produce NaN positions', () => {
    const { container } = render(<RangeBar marks={[{ value: 10, kind: 'dot' }]} fill={null} />);
    expect((container.querySelector('b.dot') as HTMLElement).style.insetInlineStart).toBe('50%');
  });

  it('ShareBar is an img named by its label, legend lists name and value, buttons toggle', async () => {
    const onSelect = vi.fn<() => void>();
    const { container } = render(
      <ShareBar
        label="Banking 62 percent, Hydropower 38 percent"
        foot="Unlisted holdings are left out"
        items={[
          { key: 'b', label: 'Banking', sub: '4 stocks', pct: 62, tone: 'chart', onSelect, selected: true },
          { key: 'h', label: 'Hydropower', pct: 38, tone: 'series2', value: '38 %' },
          { key: 'z', label: 'Zero', pct: 0, tone: 'rest' },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: /Banking 62 percent/ })).toBeTruthy();
    expect(container.querySelectorAll('.kit-share-bar > i')).toHaveLength(2);
    const btn = screen.getByRole('button', { name: /Banking/ });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('62.0%')).toBeTruthy();
    expect(screen.getByText('38 %')).toBeTruthy();
    expect(screen.getByText('Unlisted holdings are left out')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('ShareBar legend="none" prints no legend and an all-zero bar is marked empty', () => {
    const { container } = render(<ShareBar label="Nothing held" legend="none" items={[{ key: 'a', label: 'A', pct: 0, tone: 'chart' }]} />);
    expect(container.querySelector('.kit-share-legend')).toBeNull();
    expect(container.querySelector('.kit-share-bar.empty')).toBeTruthy();
  });

  it('DistributionBar runs lowest to highest in the bar, legend in the order given with counts', () => {
    const { container } = render(
      <DistributionBar label="12 strong, 30 middling, 8 weak" foot="5 not rated are left out" items={[
        { key: '4', label: 'Strong', count: 12, step: 4 },
        { key: '2', label: 'Middling', count: 30, step: 2, value: '30' },
        { key: '0', label: 'Weak', count: 8, step: 0 },
      ]} />,
    );
    const tones = [...container.querySelectorAll('.kit-share-bar > i')].map((i) => i.className);
    expect(tones).toEqual(['kit-tone-scale0', 'kit-tone-scale2', 'kit-tone-scale4']);
    const legend = [...container.querySelectorAll('.kit-share-legend .nm')].map((n) => n.textContent);
    expect(legend).toEqual(['Strong', 'Middling', 'Weak']);
    expect(screen.getByText('5 not rated are left out')).toBeTruthy();
  });

  it('ShareDonut draws one stroked slice per share, starting where the last ended, with the count in the middle', () => {
    const { container } = render(<ShareDonut label="Two sectors" count="2" unit="sectors" items={[{ key: 'a', pct: 25, tone: 'gain' }, { key: 'b', pct: 75, tone: 'loss' }]} />);
    const circles = [...container.querySelectorAll('circle')];
    expect(circles.map((c) => c.getAttribute('class'))).toEqual(['kit-stroke-gain', 'kit-stroke-loss']);
    expect(Number(circles[0]?.getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
    expect(Number(circles[1]?.getAttribute('stroke-dashoffset'))).toBeLessThan(0);
    expect(screen.getByRole('img', { name: 'Two sectors' })).toBeTruthy();
    expect(container.textContent).toContain('sectors');
  });

  it('has twelve distinct share tones', () => {
    expect(new Set(SHARE_TONES).size).toBe(12);
  });
});

describe('SummaryFigure', () => {
  it('renders label, figure and note; tone and size set the classes', () => {
    const { container, rerender } = render(<SummaryFigure label="If you sold everything today" value="Rs 1,24,500" note="after fees" testId="sf" />);
    expect(screen.getByTestId('sf').className).toBe('kit-sumfig lead');
    expect(screen.getByText('Rs 1,24,500').tagName).toBe('B');
    expect(screen.getByText('after fees')).toBeTruthy();
    rerender(<SummaryFigure label="Invested" value="Rs 90,000" tone="tint" size="lg" testId="sf" />);
    expect(screen.getByTestId('sf').className).toBe('kit-sumfig lg');
    expect(container.querySelector('.kit-sumfig-n')).toBeNull();
  });
});

describe('StatusDisc, CheckList, CheckRow', () => {
  it('StatusDisc is decorative and carries its tone', () => {
    render(<StatusDisc tone="warn" size="lg"><svg /></StatusDisc>);
    const disc = document.querySelector('.kit-disc') as HTMLElement;
    expect(disc.className).toBe('kit-disc warn lg');
    expect(disc.getAttribute('aria-hidden')).toBe('true');
  });

  it('a button row reports pressed, calls back, and shows its status as words', async () => {
    const onClick = vi.fn<() => void>();
    const { container } = render(
      <CheckList label="Portfolio checks">
        <CheckRow icon={<svg />} tone="warn" title="Concentration" line="Banking is 62% of holdings" figure="62%" figureSub="+2.1% this month" figureSubTone="gain" status={{ label: 'Watch', tone: 'warn' }} onClick={onClick} pressed testId="c1" />
        <CheckRow icon={<svg />} title="Fees" line="Within range" />
      </CheckList>,
    );
    const list = screen.getByRole('list', { name: 'Portfolio checks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Watch')).toBeTruthy();
    expect(screen.getByTestId('c1-value').textContent).toBe('62%');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('a link row uses the linkComponent for in-app paths and a plain anchor for absolute ones', () => {
    render(
      <CheckList label="Reports">
        <CheckRow icon={<svg />} title="Annual report" href="/reports/annual" linkComponent={RouterLink} kind="report" />
        <CheckRow icon={<svg />} title="Filing" href="https://example.com/filing" linkComponent={RouterLink} target="_blank" />
      </CheckList>,
    );
    const [inApp, abs] = screen.getAllByRole('link');
    expect(inApp?.getAttribute('data-router')).toBe('yes');
    expect(inApp?.getAttribute('href')).toBe('/reports/annual');
    expect(abs?.getAttribute('data-router')).toBeNull();
    expect(abs?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('a row with an action is plain and keeps the action as its own control', async () => {
    const onAdd = vi.fn<() => void>();
    render(
      <CheckList label="Start">
        <CheckRow icon={<svg />} title="No holdings yet" onClick={() => {}} href="/x" action={<button type="button" onClick={onAdd}>Add a holding</button>} />
      </CheckList>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add a holding' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('a tab list has tab semantics and Arrow/Home/End move focus between tabs', async () => {
    const { container } = render(
      <CheckList role="tablist" label="Checks">
        {['a', 'b', 'c'].map((id, i) => (
          <CheckRow key={id} icon={<svg />} title={`Check ${id}`} onClick={() => {}} tab={{ selected: i === 0, controls: `p-${id}`, id: `t-${id}`, tabIndex: i === 0 ? 0 : -1 }} />
        ))}
      </CheckList>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    tabs[0]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(tabs[1]);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(tabs[2]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(tabs[0]);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(tabs[2]);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(tabs[0]);
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical');
    expect(container.querySelectorAll('[role="presentation"]')).toHaveLength(0);
  });

  it('a caller key handler can cancel the built-in arrow keys', () => {
    render(
      <CheckList role="tablist" label="Checks" onKeyDown={(e) => e.preventDefault()}>
        <CheckRow icon={<svg />} title="A" onClick={() => {}} tab={{ selected: true, controls: 'p', id: 't1', tabIndex: 0 }} />
        <CheckRow icon={<svg />} title="B" onClick={() => {}} tab={{ selected: false, controls: 'p', id: 't2', tabIndex: -1 }} />
      </CheckList>,
    );
    const [a] = screen.getAllByRole('tab');
    a?.focus();
    fireEvent.keyDown(a as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(a);
  });
});

describe('InlineState', () => {
  it('renders icon, title, body and actions; layout and tone are classes; a failure is an alert', async () => {
    const onRetry = vi.fn<() => void>();
    const { container } = render(
      <InlineState icon="error" tone="error" role="alert" layout="row" title="Prices did not load" body="Last updated 11:02" actions={<button type="button" onClick={onRetry}>Try again</button>} testId="is" />,
    );
    const el = screen.getByRole('alert');
    expect(el.className).toBe('kit-istate row error');
    expect(within(el).getByText('Prices did not load').tagName).toBe('B');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('omits empty parts and supports bare, className and the status role', () => {
    render(<InlineState icon="lock" bare title="Not included on this account" role="status" className="x" />);
    const el = screen.getByRole('status');
    expect(el.className).toBe('kit-istate stack bare x');
    expect(el.querySelector('.kit-istate-acts')).toBeNull();
    expect(el.querySelector('p')).toBeNull();
  });
});

describe('KeyStats', () => {
  it('is a description list; unknown values say so in words; sub lines and tones render', async () => {
    const { container } = render(
      <KeyStats label="NABIL session" empty="Not published" items={[
        { label: 'Open', value: '1,020.00' },
        { label: 'High', value: null },
        { label: 'Net position', value: '+1,200', tone: 'up', sub: 'since Poush' },
        { label: 'Loss', value: '-300', tone: 'down' },
      ]} />,
    );
    expect(screen.getByLabelText('NABIL session').tagName).toBe('DL');
    expect(screen.getByText('Not published').className).toBe('none');
    expect(screen.getByText('+1,200').className).toBe('up');
    expect(screen.getByText('-300').className).toBe('down');
    expect(screen.getByText('since Poush').className).toBe('sub');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('while loading, unknown values are skeletons (hidden) and the list is busy', () => {
    const { container } = render(<KeyStats loading empty="Not published" items={[{ label: 'Open', value: null }, { label: 'High', value: '1,100' }]} />);
    expect(container.querySelector('dl')?.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('dd.wait .kit-skel')).toBeTruthy();
    expect(screen.queryByText('Not published')).toBeNull();
  });

  it('strip and three-column layouts set the class', () => {
    const { container, rerender } = render(<KeyStats layout="strip" empty="-" items={[{ label: 'O', value: '1' }]} />);
    expect(container.querySelector('dl')?.className).toBe('kit-kstats strip');
    rerender(<KeyStats cols={3} empty="-" items={[{ label: 'O', value: '1' }]} />);
    expect(container.querySelector('dl')?.className).toBe('kit-kstats c3');
  });
});

describe('FactList', () => {
  it('renders a title and label/value pairs, quiet notes and the stack layout', async () => {
    const { container } = render(
      <FactList title="Across every month" stack testId="fl" facts={[
        { label: 'Rose most often', value: 'July · 2 of 2' },
        { label: 'On average', value: 'Need 5 years', quiet: true, testId: 'fl-avg' },
      ]} />,
    );
    expect(screen.getByTestId('fl').className).toBe('kit-facts stack');
    expect(screen.getByText('Across every month')).toBeTruthy();
    expect(screen.getByTestId('fl-avg').className).toBe('quiet');
    expect(screen.getByText('Rose most often').tagName).toBe('DT');
    expect(screen.getByText('July · 2 of 2').tagName).toBe('DD');
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('StepList', () => {
  const steps = [{ title: 'Add a holding', body: 'Search for NABIL' }, { title: 'Set an alert' }, { title: 'Import from MeroShare' }];

  it('is an ordered list; the current step is marked and numbered 1..n', async () => {
    const { container } = render(<StepList title="First steps" eyebrow="New here" lead="Three steps" foot="Takes two minutes" steps={steps} current={1} testId="sl" />);
    expect(screen.getByRole('heading', { level: 2, name: 'First steps' })).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]?.getAttribute('aria-current')).toBe('step');
    expect(items[0]?.getAttribute('aria-current')).toBeNull();
    expect(container.querySelectorAll('.n')[1]?.className).toContain('on');
    expect(screen.getByTestId('sl').className).toContain('kit-inv');
    expect(screen.getByText('Takes two minutes')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('current -1 marks none; plain tone drops the inverse surface; heading level is adjustable', () => {
    render(<StepList title="Questions" headingLevel={3} tone="plain" layout="rows" current={-1} steps={steps} testId="sl" />);
    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
    expect(screen.getByTestId('sl').className).toBe('kit-steps rows');
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('banner layout has a dismiss button with its name', async () => {
    const onDismiss = vi.fn<() => void>();
    render(<StepList layout="banner" title="Welcome" steps={steps} onDismiss={onDismiss} dismissLabel="Hide the guide" dismissTestId="x" />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide the guide' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('x')).toBeTruthy();
  });
});

describe('CardLink', () => {
  it('an in-app path uses the linkComponent (or a plain anchor), same tab, with a chevron', () => {
    const { rerender, container } = render(<CardLink href="/portfolio" linkComponent={RouterLink} testId="cl">Open portfolio</CardLink>);
    let a = screen.getByRole('link', { name: 'Open portfolio' });
    expect(a.getAttribute('data-router')).toBe('yes');
    expect(a.getAttribute('data-link')).toBe('in');
    expect(a.getAttribute('target')).toBeNull();
    expect(container.querySelector('.kit-chev')).toBeTruthy();
    rerender(<CardLink href="/portfolio">Open portfolio</CardLink>);
    a = screen.getByRole('link', { name: 'Open portfolio' });
    expect(a.getAttribute('data-router')).toBeNull();
  });

  it('an absolute address opens a new tab safely and says so in words', () => {
    const { container } = render(<CardLink href="https://nepalstock.com/company/NABIL" linkComponent={RouterLink} newTabLabel="(opens in a new tab)">NEPSE page</CardLink>);
    const a = screen.getByRole('link', { name: /NEPSE page/ });
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('data-router')).toBeNull();
    expect(a.textContent).toContain('(opens in a new tab)');
    expect(container.querySelector('.kit-ext')).toBeTruthy();
  });

  it('ariaLabel names the link and gets the new-tab words appended; external overrides the address', () => {
    render(<CardLink href="/stock/NABIL" external ariaLabel="Stock page: NABIL" newTabLabel="(new tab)">NABIL</CardLink>);
    expect(screen.getByRole('link', { name: 'Stock page: NABIL (new tab)' }).getAttribute('target')).toBe('_blank');
  });

  it('is reachable and activatable by keyboard', async () => {
    const { container } = render(<CardLink href="/alerts">All alerts</CardLink>);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('link'));
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('LinkTable', () => {
  const columns = [
    { key: 's', label: 'Stock', track: 'minmax(0, 1.4fr)' },
    { key: 'v', label: 'Value', track: '96px', end: true },
  ];

  it('names the list, draws aria-hidden heads, right-aligns end columns and links rows through the adapter', async () => {
    const { container } = render(
      <LinkTable label="Holdings" columns={columns} linkComponent={RouterLink} testId="lt">
        <LinkTableRow href="/stock/NABIL" ariaLabel="NABIL, 100 shares, Rs 51,230" cells={[<StockLabel key="a" symbol="NABIL" line="Nabil Bank" extra="100 shares" />, 'Rs 51,230']} compact={{ lead: 'NABIL', trail: 'Rs 51,230' }} />
        <LinkTableRow cells={['Cash', 'Rs 4,000']} />
      </LinkTable>,
    );
    const list = screen.getByRole('list', { name: 'Holdings' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(container.querySelector('.kit-lt-h')?.getAttribute('aria-hidden')).toBe('true');
    const link = screen.getByRole('link', { name: 'NABIL, 100 shares, Rs 51,230' });
    expect(link.getAttribute('data-router')).toBe('yes');
    expect(link.className).toContain('has-cp');
    expect(container.querySelectorAll('.kit-lt-c.end')).toHaveLength(2);
    expect(container.querySelector('.kit-lt')?.getAttribute('style')).toContain('minmax(0, 1.4fr) 96px 14px');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('heads, chevron and the compact breakpoint are options; absolute addresses stay plain anchors', () => {
    const { container } = render(
      <LinkTable label="Sectors" columns={columns} heads={false} chevron={false} compactAt={360} linkComponent={RouterLink}>
        <LinkTableRow href="https://example.com/s" cells={['Banking', '62%']} />
      </LinkTable>,
    );
    expect(container.querySelector('.kit-lt-h')).toBeNull();
    expect(container.querySelector('.kit-lt')?.className).toContain('cq-sm');
    expect(container.querySelector('.kit-lt')?.className).not.toContain('chev');
    expect(container.querySelector('.kit-lt')?.getAttribute('style')).toContain('minmax(0, 1.4fr) 96px');
    expect(screen.getByRole('link').getAttribute('data-router')).toBeNull();
  });

  it('StockLabel keeps the symbol, tag, name and the extra fact after a decorative dot', () => {
    const { container } = render(<StockLabel symbol="NABIL" tag={<span>Bonus</span>} line="Nabil Bank" extra="100 shares" shrink testId="sl" />);
    expect(screen.getByTestId('sl').className).toBe('kit-stock shrink');
    expect(screen.getByText('Bonus')).toBeTruthy();
    expect(container.querySelector('.kit-stock-x [aria-hidden="true"]')?.textContent).toBe('·');
    expect(container.querySelector('.kit-stock-x')?.textContent).toContain('100 shares');
    const { container: bare } = render(<StockLabel symbol="X" />);
    expect(bare.querySelector('.kit-stock-2')).toBeNull();
  });
});
