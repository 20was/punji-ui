/**
 * Squarified treemap (Bruls, Huizing, van Wijk). Pure and deterministic: the
 * same items and bounds always give the same rectangles. Items sort by size,
 * largest first, ties by input position. Sizes that are missing, not finite or
 * not above zero are not drawn (a rectangle of zero area cannot be seen or
 * hit) and are reported in `skipped`, in input order.
 *
 * Every drawn rectangle's area is `size / total × bounds area`, the
 * rectangles tile the bounds with no overlap and no gap, up to floating-point
 * rounding.
 */

export interface TreemapItem { id: string; size: number | null | undefined }
export interface TreemapBounds { x?: number; y?: number; width: number; height: number }
export interface TreemapRect { id: string; x: number; y: number; width: number; height: number }
export interface TreemapLayout { rects: TreemapRect[]; skipped: string[] }

interface Entry { id: string; area: number }

/** Worst aspect ratio of a row laid along a side of length `side` (>= 1; closer to 1 is squarer). */
function worst(row: readonly Entry[], side: number): number {
  let sum = 0;
  let max = -Infinity;
  let min = Infinity;
  for (const e of row) { sum += e.area; max = Math.max(max, e.area); min = Math.min(min, e.area); }
  const s2 = sum * sum;
  return Math.max((side * side * max) / s2, s2 / (side * side * min));
}

export function squarify(items: readonly TreemapItem[], bounds: TreemapBounds): TreemapLayout {
  const { width, height } = bounds;
  if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) throw new RangeError('Treemap bounds need a positive width and height');
  const skipped: string[] = [];
  const valid: { id: string; size: number; index: number }[] = [];
  items.forEach((item, index) => {
    if (typeof item.size === 'number' && Number.isFinite(item.size) && item.size > 0) valid.push({ id: item.id, size: item.size, index });
    else skipped.push(item.id);
  });
  if (valid.length === 0) return { rects: [], skipped };
  valid.sort((a, b) => b.size - a.size || a.index - b.index);
  // Halve before summing so a list of very large finite sizes cannot overflow to Infinity.
  const total = valid.reduce((sum, v) => sum + v.size / 2, 0) * 2;
  const entries: Entry[] = valid.map((v) => ({ id: v.id, area: ((v.size / 2) / (total / 2)) * width * height }));

  const rects: TreemapRect[] = [];
  let x = bounds.x ?? 0;
  let y = bounds.y ?? 0;
  let w = width;
  let h = height;
  const place = (row: readonly Entry[], last: boolean) => {
    const sum = row.reduce((s, e) => s + e.area, 0);
    if (w >= h) {
      // A column on the left, items stacked top to bottom.
      const colWidth = last ? w : sum / h;
      let cy = y;
      row.forEach((e, i) => {
        const eh = i === row.length - 1 ? y + h - cy : e.area / colWidth;
        rects.push({ id: e.id, x, y: cy, width: colWidth, height: eh });
        cy += eh;
      });
      x += colWidth;
      w -= colWidth;
    } else {
      // A row along the top, items left to right.
      const rowHeight = last ? h : sum / w;
      let cx = x;
      row.forEach((e, i) => {
        const ew = i === row.length - 1 ? x + w - cx : e.area / rowHeight;
        rects.push({ id: e.id, x: cx, y, width: ew, height: rowHeight });
        cx += ew;
      });
      y += rowHeight;
      h -= rowHeight;
    }
  };

  let row: Entry[] = [];
  let i = 0;
  while (i < entries.length) {
    const next = entries[i]!;
    const side = Math.min(w, h);
    if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      i += 1;
    } else {
      place(row, false);
      row = [];
    }
  }
  if (row.length) place(row, true);
  return { rects, skipped };
}

/**
 * The colour step of a change on a diverging scale: 0 for unchanged (rounds to 0.00), ±1..±3 by
 * how far it is from zero, with step 3 from two thirds of `max` upward. Null for a missing change.
 */
export function heatStep(change: number | null | undefined, max = 3): -3 | -2 | -1 | 0 | 1 | 2 | 3 | null {
  if (change === null || change === undefined || !Number.isFinite(change)) return null;
  if (!(max > 0)) throw new RangeError('max must be above zero');
  if (Math.abs(change) < 0.005) return 0;
  const magnitude = Math.min(3, Math.max(1, Math.ceil(Math.abs(change) / (max / 3))));
  return (change < 0 ? -magnitude : magnitude) as -3 | -2 | -1 | 1 | 2 | 3;
}
