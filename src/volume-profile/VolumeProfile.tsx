'use client';

/**
 * VolumeProfile (design.punji.app/components/volume-profile): volume traded at each price, as a horizontal histogram.
 * The Point of Control (the busiest band) is a solid line, and the value area (the bands around it that hold 70% of
 * the volume by default) is shaded between a high and a low line, each tagged POC, VAH and VAL in words. An optional
 * buy and sell split shows buyer- and seller-initiated volume (solid against hatched, so it never leans on hue).
 * `ProfileRail` is the same drawing, narrow and without an axis, to sit beside a price chart on a price scale you
 * pass in (`priceDomain`), so a band lines up with the same price on the chart.
 *
 * The maths is `volumeProfile` in chart-math: volumes are `bigint`, prices decimal strings, nothing is rounded but the
 * percentages printed. Accessible alternative: ChartA11yShell (one focus stop; Up and Down step between price bands,
 * Home and End jump to the lowest and highest, Escape clears; live region; spoken summary; hidden table of every band).
 */
import { useId, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { volumeProfile, type ProfileBar, type ProfileRow, type VolumeProfileOptions, type VolumeProfileResult } from '../chart-math/volumeProfile.ts';
import { clamp, useMeasuredWidth } from '../internal/chartFrame.tsx';

export { volumeProfile } from '../chart-math/volumeProfile.ts';
export type { ProfileBar, ProfileRow, ProfileValueArea, VolumeInput, VolumeProfileOptions, VolumeProfileResult } from '../chart-math/volumeProfile.ts';

export interface VolumeProfileLabels {
  empty?: ReactNode;
  /** "Price band". */
  band?: string;
  volume?: string;
  share?: string;
  buy?: string;
  sell?: string;
  role?: string;
  /** "Point of Control". */
  poc?: string;
  /** "Value area". */
  valueArea?: string;
  /** Short line tags. Defaults "POC", "VAH", "VAL". */
  pocTag?: string;
  vahTag?: string;
  valTag?: string;
  /** "Outside the value area". */
  outside?: string;
  hint?: string;
  summary?: (info: { rows: number; min: string; max: string; total: string; poc: string; pocShare: string; vaLow: string; vaHigh: string; vaShare: string }) => string;
}

interface ProfileCommon {
  /** Bars (a price range with its volume) to build the profile from. Give `bars` or a ready `profile`. */
  bars?: readonly ProfileBar[];
  /** A profile already built with `volumeProfile`. Wins over `bars`. */
  profile?: VolumeProfileResult;
  /** Number of price bands when built from `bars`, 2 to 200. Default 24. */
  rows?: number;
  /** Share of volume the value area holds when built from `bars`. Default 0.7. */
  valueArea?: number | string;
  /** Draw buy and sell volume as two parts of each bar. Default true when the profile has the split. */
  split?: boolean;
  /** Names the chart and its data table. */
  label: string;
  /** BCP 47 tag for volume grouping. Default "en-IN". */
  locale?: string;
  /** Format a price for axis, readout and table. Default: the decimal string as given. */
  formatPrice?: (price: string) => string;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: VolumeProfileLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure. */
  testId?: string;
}

export interface VolumeProfileProps extends ProfileCommon {
  /** The plot's height in CSS px, clamped to 160..640. Default 360. */
  height?: number;
  /** Fix the price range (lowest and highest price the bands cover). Default: the bars' own range. */
  priceDomain?: { min: string; max: string };
}

export interface ProfileRailProps extends ProfileCommon {
  /** The price chart's visible price range, decimal strings. The rail's bands are cut from exactly this range, so a band sits level with the same price on a linear price scale. */
  priceDomain: { min: string; max: string };
  /** The price chart's plot height in CSS px, clamped to 160..640. Pass the chart's own height. Default 360. */
  height?: number;
  /** Space above the chart's top price, in CSS px, so the rail's top edge meets the chart's top price. Default 0. */
  paddingTop?: number;
  /** Space below the chart's lowest price, in CSS px (where the chart draws its time axis). Default 0. */
  paddingBottom?: number;
  /** The edge the bars grow from. Default "right", for a rail on a chart's right side. */
  anchor?: 'left' | 'right';
}

const AXIS_W = 62;
const DEFAULT_HEIGHT = 360;
const TAG_W = 30;

const makeFormat = (locale: string) => (v: bigint) => v.toLocaleString(locale);

interface Words {
  empty: ReactNode;
  band: string;
  volume: string;
  share: string;
  buy: string;
  sell: string;
  role: string;
  poc: string;
  valueArea: string;
  pocTag: string;
  vahTag: string;
  valTag: string;
  outside: string;
  hint: string;
  summary: NonNullable<VolumeProfileLabels['summary']>;
}

const wordsOf = (l: VolumeProfileLabels | undefined): Words => ({
  empty: 'No volume to show.',
  band: 'Price band',
  volume: 'Volume',
  share: 'Share',
  buy: 'Buy',
  sell: 'Sell',
  role: 'Role',
  poc: 'Point of Control',
  valueArea: 'Value area',
  pocTag: 'POC',
  vahTag: 'VAH',
  valTag: 'VAL',
  outside: 'Outside the value area',
  hint: 'Use the up and down arrow keys to step between price bands, Home and End to jump to the lowest and highest, Escape to clear.',
  summary: (i) =>
    `Volume profile in ${i.rows} price bands from ${i.min} to ${i.max}, total volume ${i.total}. Point of Control ${i.poc}, holding ${i.pocShare} percent. Value area ${i.vaLow} to ${i.vaHigh}, holding ${i.vaShare} percent.`,
  ...l,
});

interface PlotProps extends ProfileCommon {
  height: number;
  rail: boolean;
  priceDomain?: { min: string; max: string };
  paddingTop: number;
  paddingBottom: number;
  anchor: 'left' | 'right';
}

function Plot(p: PlotProps) {
  const words = wordsOf(p.labels);
  const locale = p.locale ?? 'en-IN';
  const fmtVol = makeFormat(locale);
  const fmtPrice = p.formatPrice ?? ((s: string) => s);
  const patId = useId();
  const { ref, width } = useMeasuredWidth(p.rail ? 120 : 480);
  const options: VolumeProfileOptions = { rows: p.rows, valueArea: p.valueArea, range: p.priceDomain };
  const profile = p.profile ?? volumeProfile(p.bars ?? [], options);
  const { rows } = profile;
  const height = clamp(Math.round(p.height), 160, 640);
  const empty = profile.totalVolume === 0n;
  const hasSplit = (p.split ?? true) && rows.every((r) => r.buyVolume !== null) && rows.length > 0;
  const top = p.rail ? clamp(p.paddingTop, 0, height / 2) : 8;
  const bottom = p.rail ? clamp(p.paddingBottom, 0, height / 2) : 8;
  const gutter = p.rail ? 0 : AXIS_W;
  const plotH = Math.max(1, height - top - bottom);
  const N = rows.length;
  const rh = plotH / Math.max(1, N);
  const barW = Math.max(1, width - gutter - (p.rail ? 0 : TAG_W));
  const maxVol = rows.reduce((m, r) => (r.volume > m ? r.volume : m), 0n);
  const rowY = (i: number) => top + (N - 1 - i) * rh;
  const fromRight = p.rail && p.anchor === 'right';
  const x0 = fromRight ? width : gutter;
  const len = (v: bigint) => (maxVol === 0n ? 0 : Math.max(v > 0n ? 1 : 0, (Number((v * 100_000n) / maxVol) / 100_000) * barW));
  const seg = (start: number, l: number) => (fromRight ? x0 - start - l : x0 + start);
  const poc = profile.pocIndex === null ? null : rows[profile.pocIndex]!;
  const va = profile.valueArea;
  const band = (r: ProfileRow) => `${fmtPrice(r.low)} to ${fmtPrice(r.high)}`;
  const roleOf = (r: ProfileRow) => (r.isPoc ? words.poc : r.inValueArea ? words.valueArea : words.outside);
  const speak = (i: number) => {
    const r = rows[i]!;
    return `${band(r)}: ${words.volume} ${fmtVol(r.volume)}, ${r.share} percent${r.buyVolume !== null ? `, ${words.buy} ${fmtVol(r.buyVolume)}, ${words.sell} ${fmtVol(r.sellVolume!)}` : ''}. ${roleOf(r)}.`;
  };
  const summary =
    poc && va
      ? words.summary({ rows: N, min: fmtPrice(profile.min), max: fmtPrice(profile.max), total: fmtVol(profile.totalVolume), poc: band(poc), pocShare: poc.share, vaLow: fmtPrice(va.low), vaHigh: fmtPrice(va.high), vaShare: va.share })
      : undefined;

  const table = (
    <ChartDataTable
      caption={p.label}
      head={[words.band, words.volume, words.share, ...(rows[0]?.buyVolume !== null && N > 0 ? [words.buy, words.sell] : []), words.role]}
      rows={rows.toReversed().map((r) => ({
        key: String(r.index),
        head: band(r),
        cells: [fmtVol(r.volume), `${r.share}%`, ...(r.buyVolume !== null ? [fmtVol(r.buyVolume), fmtVol(r.sellVolume!)] : []), roleOf(r)],
      }))}
    />
  );

  if (empty) {
    return (
      <figure className={`pu-vp kit-ct ${p.className ?? ''}`.trim()} aria-label={p.label} data-testid={p.testId}>
        <p className="kit-ct-empty" role="status">{words.empty}</p>
      </figure>
    );
  }

  const tick = Math.max(1, Math.ceil(26 / rh));
  const draw = (ctx: ChartA11yContext) => {
    const active = ctx.index;
    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      const k = Math.floor((e.clientY - box.top - top) / rh);
      ctx.pointerTo(k < 0 || k >= N ? null : N - 1 - k);
    };
    const props = ctx.plotProps(onPointer);
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        ctx.pointerTo(clamp((active ?? (e.key === 'ArrowUp' ? -1 : N)) + (e.key === 'ArrowUp' ? 1 : -1), 0, N - 1));
        return;
      }
      props.onKeyDown?.(e);
    };
    const activeRow = active === null ? null : rows[active]!;
    return (
      <div className="pu-vp-area" ref={ref}>
        {/* The shell gives this element its role, name and tab stop; the keys are the shell's plus Up and Down. */}
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="kit-ct-plot pu-vp-plot" style={{ height }} {...props} onKeyDown={interactiveKeys(props, onKeyDown)}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
            <defs>
              <pattern id={patId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className="pu-vp-hatch-bg" />
                <line x1="0" y1="0" x2="0" y2="6" className="pu-vp-hatch" />
              </pattern>
            </defs>
            {va && <rect className="pu-vp-va" x={0} y={rowY(va.highIndex)} width={width} height={(va.highIndex - va.lowIndex + 1) * rh} />}
            {rows.map((r) => {
              const y = rowY(r.index);
              const h = Math.max(1, rh - (rh > 5 ? 1.5 : 0));
              const cls = `pu-vp-bar${r.inValueArea ? ' in' : ''}${r.isPoc ? ' poc' : ''}${active === r.index ? ' on' : ''}`;
              if (hasSplit) {
                const b = len(r.buyVolume!);
                const s = len(r.sellVolume!);
                return (
                  <g key={r.index} className={cls}>
                    <rect className="pu-vp-buy" x={seg(0, b)} y={y} width={b} height={h} />
                    <rect className="pu-vp-sell" x={seg(b, s)} y={y} width={s} height={h} fill={`url(#${patId})`} />
                  </g>
                );
              }
              const l = len(r.volume);
              return <rect key={r.index} className={`${cls} pu-vp-total`} x={seg(0, l)} y={y} width={l} height={h} />;
            })}
            {!p.rail && rows.map((r) => (r.index % tick === 0 ? <text key={r.index} className="kit-ct-axis" x={gutter - 6} y={rowY(r.index) + rh} textAnchor="end" dominantBaseline="middle">{fmtPrice(r.low)}</text> : null))}
            {!p.rail && <text className="kit-ct-axis" x={gutter - 6} y={top} textAnchor="end" dominantBaseline="middle">{fmtPrice(profile.max)}</text>}
            {va && (
              <>
                <line className="pu-vp-edge" x1={0} x2={width} y1={rowY(va.highIndex)} y2={rowY(va.highIndex)} />
                <line className="pu-vp-edge" x1={0} x2={width} y1={rowY(va.lowIndex) + rh} y2={rowY(va.lowIndex) + rh} />
              </>
            )}
            {poc && <line className="pu-vp-poc-line" x1={0} x2={width} y1={rowY(poc.index) + rh / 2} y2={rowY(poc.index) + rh / 2} />}
            {(!p.rail || width >= 96) && va && poc && (
              <g className="pu-vp-tags">
                {/* A rail can be short: a tag that would sit on the POC tag is left out (the lines and the table still say it). */}
                {(!p.rail || rowY(poc.index) + rh / 2 - rowY(va.highIndex) >= 28) && <text x={width - 4} y={rowY(va.highIndex) + 11} textAnchor="end">{words.vahTag}</text>}
                {(!p.rail || rowY(va.lowIndex) + rh - (rowY(poc.index) + rh / 2) >= 20) && <text x={width - 4} y={rowY(va.lowIndex) + rh - 4} textAnchor="end">{words.valTag}</text>}
                <text x={width - 4} y={rowY(poc.index) + rh / 2 - 4} textAnchor="end" className="strong">{words.pocTag}</text>
              </g>
            )}
            {activeRow && <rect className="pu-vp-cursor" x={0.5} y={rowY(activeRow.index)} width={width - 1} height={Math.max(2, rh)} />}
          </svg>
        </div>
        {!p.rail && (
          <p className="pu-vp-read" aria-hidden="true">
            {activeRow ? speak(activeRow.index) : poc && va ? `${words.poc} ${band(poc)}. ${words.valueArea} ${fmtPrice(va.low)} to ${fmtPrice(va.high)}, ${va.share}%.` : ''}
          </p>
        )}
      </div>
    );
  };

  const legend = (
    <ul className="kit-ct-legend pu-vp-legend" aria-hidden="true">
      {hasSplit ? (
        <>
          <li><svg width="16" height="10"><rect className="pu-vp-buy" width="16" height="10" /></svg>{words.buy}</li>
          <li><svg width="16" height="10"><rect width="16" height="10" fill={`url(#${patId})`} /></svg>{words.sell}</li>
        </>
      ) : null}
      <li><svg width="16" height="10"><rect className="pu-vp-va" width="16" height="10" /></svg>{words.valueArea}</li>
      <li><svg width="16" height="10"><line className="pu-vp-poc-line" x1="0" x2="16" y1="5" y2="5" /></svg>{words.poc}</li>
    </ul>
  );

  return (
    <ChartA11yShell
      label={p.label}
      roleDescription="volume profile"
      count={N}
      speak={speak}
      hint={words.hint}
      summary={summary}
      table={table}
      interactive={p.interactive}
      className={`pu-vp kit-ct${p.rail ? ' pu-vp-rail' : ''} ${p.className ?? ''}`.trim()}
      testId={p.testId}
      footer={p.rail && width < 96 ? null : legend}
    >
      {draw}
    </ChartA11yShell>
  );
}

/** Spread-safe keydown: the shell's props carry none when the shell is not interactive. */
function interactiveKeys(props: { onKeyDown?: unknown }, handler: (e: KeyboardEvent<HTMLDivElement>) => void) {
  return props.onKeyDown ? handler : undefined;
}

/**
 * @stability beta
 */
export function VolumeProfile({ height = DEFAULT_HEIGHT, priceDomain, ...rest }: VolumeProfileProps) {
  return <Plot {...rest} height={height} priceDomain={priceDomain} rail={false} paddingTop={0} paddingBottom={0} anchor="left" />;
}

/**
 * The profile as a narrow rail beside a price chart, on the chart's price scale.
 * @stability beta
 */
export function ProfileRail({ height = DEFAULT_HEIGHT, paddingTop = 0, paddingBottom = 0, anchor = 'right', ...rest }: ProfileRailProps) {
  return <Plot {...rest} height={height} rail paddingTop={paddingTop} paddingBottom={paddingBottom} anchor={anchor} />;
}
