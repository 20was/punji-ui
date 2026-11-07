/**
 * ScoreRadar geometry: where the rings, spokes and axis labels go so no label touches another or leaves the picture,
 * from 280 px wide up. Pure and measured by character count (the labels are 11 px text), so it renders the same on the
 * server and in the browser. Not exported from the package.
 */

export const CHAR_W = 6.6;
export const LINE_H = 13;
const LABEL_GAP = 10;

export interface RadarBox {
  /** Top-left of the label's box, relative to the centre. */
  x: number;
  y: number;
  w: number;
  h: number;
  anchor: 'start' | 'middle' | 'end';
  /** Where the text starts: x for start, centre for middle, right edge for end. */
  tx: number;
  /** The first line's baseline. */
  ty: number;
  lines: string[];
  /** The spoke's tip and the unit vector of the axis. */
  tip: { x: number; y: number };
}

export interface RadarLayout {
  r: number;
  /** The viewBox that holds the ring and every label, relative to the centre. */
  view: { x: number; y: number; w: number; h: number };
  boxes: RadarBox[];
}

/** At most two lines of at most `maxChars` characters, ending in an ellipsis when cut. */
export function wrapLabel(label: string, maxChars: number): string[] {
  const max = Math.max(4, Math.floor(maxChars));
  const words = label.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= max) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  const cut = (s: string) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
  if (lines.length <= 2) return lines.map(cut);
  return [cut(lines[0]!), cut(`${lines[1]!} ${lines.slice(2).join(' ')}`)];
}

/** The unit vector of axis i of n, starting at the top and going clockwise. */
export const axisVector = (i: number, n: number): { x: number; y: number } => {
  const a = (2 * Math.PI * i) / n;
  return { x: Math.sin(a), y: -Math.cos(a) };
};

/**
 * Lays out n axes in a container `width` px wide. `labels[i]` is the axis name, `values[i]` the printed score
 * ("6/6"), drawn under the name. The ring's radius shrinks until the widest side label fits the container.
 */
export function radarLayout(width: number, labels: readonly string[], values: readonly string[]): RadarLayout {
  const labelW = Math.min(112, Math.max(64, width * 0.27));
  const maxChars = Math.floor(labelW / CHAR_W);
  let r = Math.min(150, Math.max(40, (width - 8 - 2 * (labelW + LABEL_GAP)) / 2));
  let out = layoutAt(r, labels, values, maxChars);
  // Labels that had to move out to clear a diagonal can widen the picture: shrink the ring until it fits.
  for (let k = 0; k < 6 && out.view.w > width && r > 36; k += 1) {
    r = Math.max(36, r - (out.view.w - width) / 2 - 0.5);
    out = layoutAt(r, labels, values, maxChars);
  }
  return out;
}

function layoutAt(r: number, labels: readonly string[], values: readonly string[], maxChars: number): RadarLayout {
  const n = labels.length;
  const boxes: RadarBox[] = labels.map((label, i) => {
    const u = axisVector(i, n);
    const lines = [...wrapLabel(label, maxChars), values[i] ?? ''];
    const w = Math.max(...lines.map((l) => l.length)) * CHAR_W;
    const h = lines.length * LINE_H;
    const side = Math.abs(u.x) < 0.2 ? 'middle' : u.x > 0 ? 'start' : 'end';
    const place = (d: number) => {
      const px = u.x * d;
      const py = u.y * d;
      const x = side === 'middle' ? px - w / 2 : side === 'start' ? px : px - w;
      // Above the ring for the top axis, below it for the bottom one, centred on the spoke at the sides.
      const y = Math.abs(u.y) > 0.8 ? (u.y < 0 ? py - h : py + 2) : py - h / 2;
      return { px, x, y };
    };
    // Move the label out along its spoke until its box clears the ring.
    let d = r + LABEL_GAP;
    let at = place(d);
    for (let k = 0; k < 60 && boxGap(at.x, at.y, w, h) < r + 3; k += 1) {
      d += 2;
      at = place(d);
    }
    return { x: at.x, y: at.y, w, h, anchor: side, tx: at.px, ty: at.y + LINE_H - 3, lines, tip: { x: u.x * r, y: u.y * r } };
  });
  const xs = [-r, r, ...boxes.flatMap((b) => [b.x, b.x + b.w])];
  const ys = [-r, r, ...boxes.flatMap((b) => [b.y, b.y + b.h])];
  const x0 = Math.min(...xs) - 4;
  const y0 = Math.min(...ys) - 4;
  return { r, view: { x: x0, y: y0, w: Math.max(...xs) + 4 - x0, h: Math.max(...ys) + 4 - y0 }, boxes };
}

/** Distance from the origin to the nearest point of a box. */
const boxGap = (x: number, y: number, w: number, h: number): number => Math.hypot(Math.max(x, Math.min(0, x + w)), Math.max(y, Math.min(0, y + h)));

/** True when two label boxes touch or overlap. */
export const boxesOverlap = (a: Pick<RadarBox, 'x' | 'y' | 'w' | 'h'>, b: Pick<RadarBox, 'x' | 'y' | 'w' | 'h'>): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
