// docs/API-CONVENTIONS.md: each conventional name renders exactly as the deprecated alias it replaces.
import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  BreakdownRow, CheckRow, ChoiceGroup, Delta, FigureChip, HoldToConfirm, IfscInput, InlineState, KeyStats, MarketBreadth, Note,
} from '../src/index.ts';

afterEach(cleanup);

const html = (ui: ReactElement) => {
  const { container, unmount } = render(ui);
  const out = container.innerHTML;
  unmount();
  return out;
};
const same = (current: ReactElement, legacy: ReactElement) => expect(html(current)).toBe(html(legacy));
const breadth = (tone: 'gain' | 'up') => <MarketBreadth label="Breadth" advances={2} declines={1} unchanged={0} extra={[{ id: 'u', label: 'Upper', value: 1, tone }]} />;
function IfscHost({ legacy }: { legacy: boolean }) {
  const [value, setValue] = useState('');
  const words = { incomplete: (f: string) => `Type the whole ${f}.` };
  return <IfscInput label="IFSC" value={value} onValueChange={(r) => setValue(r.value)} {...(legacy ? { messages: words } : { labels: words })} />;
}

describe('API conventions: new names and their deprecated aliases', () => {
  it('direction tones: gain and loss render as up and down did', () => {
    same(<FigureChip tone="gain">+2%</FigureChip>, <FigureChip tone="up">+2%</FigureChip>);
    same(<FigureChip tone="loss">-2%</FigureChip>, <FigureChip tone="down">-2%</FigureChip>);
    same(<dl><BreakdownRow label="Fee" value="- Rs 5" tone="loss" /></dl>, <dl><BreakdownRow label="Fee" value="- Rs 5" tone="down" /></dl>);
    same(<KeyStats empty="Not known" items={[{ label: 'Net', value: '+Rs 1', tone: 'gain' }]} />, <KeyStats empty="Not known" items={[{ label: 'Net', value: '+Rs 1', tone: 'up' }]} />);
    same(breadth('gain'), breadth('up'));
    expect(html(<FigureChip tone="gain">+2%</FigureChip>)).toContain('kit-figchip up');
  });

  it('status tones: danger renders as error did', () => {
    same(<Note tone="danger">Totals do not balance.</Note>, <Note tone="error">Totals do not balance.</Note>);
    same(<InlineState icon="error" tone="danger" title="Failed" />, <InlineState icon="error" tone="error" title="Failed" />);
    expect(html(<Note tone="danger">x</Note>)).toContain('kit-note error');
  });

  it('variant replaces appearance, kind and tone where they named a visual style', () => {
    const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    same(<ChoiceGroup options={options} value="a" onChange={() => {}} label="Pick" testId="g" variant="compact" />, <ChoiceGroup options={options} value="a" onChange={() => {}} label="Pick" testId="g" appearance="compact" />);
    expect(html(<ChoiceGroup options={options} value="a" onChange={() => {}} label="Pick" testId="g" />)).toContain('kit-choice-underline');
    same(<ul><CheckRow variant="report" icon={null} title="Report" /></ul>, <ul><CheckRow kind="report" icon={null} title="Report" /></ul>);
    same(<HoldToConfirm variant="primary" onConfirm={() => {}}>Go</HoldToConfirm>, <HoldToConfirm tone="primary" onConfirm={() => {}}>Go</HoldToConfirm>);
    expect(html(<HoldToConfirm onConfirm={() => {}}>Go</HoldToConfirm>)).toContain('danger');
  });

  it('labels replaces words and messages', async () => {
    same(<Delta value={1.5} labels={{ up: 'बढेको' }} />, <Delta value={1.5} words={{ up: 'बढेको', down: 'down', flat: 'unchanged' }} />);
    for (const legacy of [false, true]) {
      const { container } = render(<IfscHost legacy={legacy} />);
      await userEvent.type(container.querySelector('input')!, 'SBIN');
      await userEvent.tab();
      expect(container.querySelector('.err')?.textContent).toBe('Type the whole IFSC.');
      cleanup();
    }
  });
});
