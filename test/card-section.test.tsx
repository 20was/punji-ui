import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Card, CardSection, CardSectionRow } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const Page = () => (
  <Card flush>
    <CardSection title="Holdings" note="as of close" titleId="h" aside={<button>Table</button>} testId="s1">
      <p>Body</p>
    </CardSection>
    <CardSectionRow weights={[2, 1]} testId="row">
      <CardSection title="Bought" headingLevel={3} titleId="b">
        <p>Buy</p>
      </CardSection>
      <CardSection title="Sold" headingLevel={3} titleId="so">
        <p>Sell</p>
      </CardSection>
    </CardSectionRow>
    <CardSection foot testId="foot">
      <p>Nothing here is advice.</p>
    </CardSection>
  </Card>
);

describe('CardSection', () => {
  it('names the section by its heading, with the note inside the heading and the aside beside it', () => {
    render(<Page />);
    const section = screen.getByRole('region', { name: /Holdings/ });
    expect(section.querySelector('h2')?.textContent).toBe('Holdingsas of close');
    expect(section.querySelector('header button')?.textContent).toBe('Table');
  });

  it('headingLevel 3 renders h3 and without a title there is no header', () => {
    render(<Page />);
    expect(screen.getByRole('heading', { level: 3, name: 'Bought' })).toBeTruthy();
    expect(screen.getByTestId('foot').querySelector('header')).toBeNull();
    expect(screen.getByTestId('foot').className).toBe('pu-card-sec foot');
  });

  it('CardSectionRow sets the column shares as a custom property and takes a class', () => {
    render(<CardSectionRow weights={[2, 1]} testId="r" className="x"><div /></CardSectionRow>);
    const inner = screen.getByTestId('r').firstElementChild as HTMLElement;
    expect(inner.style.getPropertyValue('--card-row-cols')).toBe('minmax(0, 2fr) minmax(0, 1fr)');
    expect(screen.getByTestId('r').className).toBe('pu-card-row x');
  });

  it('renders on the server', () => {
    expect(renderToString(<Page />)).toContain('pu-card-row-i');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<Page />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
