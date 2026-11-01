// Mutual fund pages: RiskMeter and the pure @punji/ui/invest helpers (XIRR, SIP and lump-sum projections, units at a
// NAV, term cover). Kept apart from registry.ts so it merges cleanly with pages added in parallel. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const INVEST_PAGES: readonly PageDef[] = [
  {
    slug: 'risk-meter',
    title: 'RiskMeter',
    group: 'portfolio',
    kind: 'component',
    description: 'A mutual fund riskometer in React: six levels from Low to Very high as a half-dial or a compact row of steps, with the level always printed in words.',
    lead: 'The riskometer every fund factsheet carries, as a dial for a fund page or a row of steps for a fund list.',
    summary:
      'A product\'s risk level on a fixed scale: the six levels most fund regulators use (Low, Low to moderate, Moderate, Moderately high, High, Very high) or your own three to eight. `variant="gauge"` draws a half-dial with a needle on the level and prints "Risk, Moderately high, 4 of 6" under it, with an optional caption ("Your principal will be at moderately high risk"). `variant="bar"` is a row of steps filled up to the level with the name beside it, for fund cards and tables. Tones run from the gain colour to the loss colour; the words carry the meaning, and the drawing is hidden from screen readers.',
    use: ['Fund lists and fund pages, product comparison tables, the suitability step of an order.', 'Any fixed ordinal scale a regulator defines: insurance plan risk, bond credit bands.'],
    avoid: ['Continuous figures (volatility, a score out of 100): use a `MeterBar` or `RangeBar` with the number.', 'Deciding the level: it comes from the fund\'s offer document.'],
    api: [...ui('risk-meter', 'RiskMeter', 'riskLevelLabels')],
    examples: [{ id: 'levels', title: 'Dial and steps', note: 'Pick a level; the bar variant sits in a fund row.' }],
    keyboard: ['Not interactive.'],
    accessibility: ['The level is text: the label, the level\'s name and "4 of 6" (visually hidden in the bar variant). The dial and steps are `aria-hidden`.', 'Forced colours: segments are drawn in CanvasText and the current one in Highlight.'],
    responsive: ['The dial fills its column up to 220px; the bar is inline and wraps its words.'],
    notes: { title: 'Scale', points: ['A level off the scale or fewer than 3 or more than 8 levels throws a RangeError: a wrong risk label is worse than none.'] },
    related: ['invest-helpers', 'meter-range', 'invest-insure'],
  },
  {
    slug: 'invest-helpers',
    title: 'Invest helpers',
    lead: 'XIRR, SIP with step-up, lump sum, the SIP for a goal, units at a NAV and term cover, in exact bigint arithmetic.',
    group: 'portfolio',
    kind: 'utility',
    description: 'Pure exact mutual fund maths: XIRR by bisection on bigint fixed point, SIP and step-up projections, the SIP for a goal, units at a NAV and life cover needed.',
    summary:
      'Pure functions in @punji/ui/invest. `xirr(flows)` solves the annual rate of dated cash flows (actual/365) by bisection with 36-place bigint fixed point, rounded half-even to 8 places, and `xnpv` checks it. `projectSip` grows monthly instalments (with an optional yearly step-up rounded to whole rupees) at an expected return compounded monthly, carrying the balance as an exact fraction and rounding each reported figure once; `projectLumpSum` does the same for one payment, and `sipForGoal` finds the smallest instalment that reaches a goal. `allotUnits` and `unitsValue` convert between money and units at a decimal NAV, rounding units down so the cost never exceeds the payment. `termCoverNeeded` is the income-replacement cover gap. Amounts are bigint minor units; no React, no browser globals.',
    use: ['Fund statements, SIP calculators and goal planners that must agree with the server to the paisa.', 'Portfolio XIRR from every dated instalment and today\'s value.'],
    avoid: ['Tax on gains, exit loads and stamp duty: apply them around these.', 'Promising returns: a projection is an illustration at the rate you pass.'],
    api: [...ui('invest', 'xirr', 'xnpv', 'projectSip', 'projectLumpSum', 'sipForGoal', 'allotUnits', 'unitsValue', 'parseNav', 'formatUnits', 'termCoverNeeded')],
    examples: [{ id: 'maths', title: 'XIRR, SIP, units, cover', note: 'The Excel XIRR example gives 37.336253%; Rs 5,000 a month at 12% for 10 years is Rs 11,61,695.38.' }],
    keyboard: ['Not interactive.'],
    accessibility: ['Not applicable: pure functions.'],
    responsive: ['Not applicable: pure functions.'],
    notes: {
      title: 'Precision',
      points: [
        'XIRR: bisection until the bracket is narrower than 10^-(digits+2), then half-even to `digits` places (default 8): within one unit in the last place of the true root. Flows with no sign change return null; with several sign changes, a root in the first bracket where the value changes sign (searching up from -99.9999%).',
        'SIP and lump sum: no intermediate rounding; tested against the closed form and with fast-check (XIRR of a SIP puts its NPV at zero; units never cost more than the payment).',
      ],
    },
    related: ['risk-meter', 'lending-helpers', 'financial-calculations', 'invest-insure'],
  },
];
