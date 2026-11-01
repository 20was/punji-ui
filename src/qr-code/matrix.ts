/**
 * A small QR Code Model 2 encoder (ISO/IEC 18004): byte mode (UTF-8), versions 1 to 40, error correction L, M, Q or H,
 * automatic version and mask choice. Pure, no dependencies, no browser globals. It returns the module grid; the
 * `QrCode` component draws it, or call `qrSvgPath` to draw it yourself (on a server, in a canvas).
 *
 * Byte mode only: payment payloads mix cases and punctuation, so numeric and alphanumeric segments would save little.
 */

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  /** Version 1 to 40. The grid is `17 + 4 * version` modules square. */
  version: number;
  /** Modules per side. */
  size: number;
  errorCorrection: QrErrorCorrection;
  /** Mask pattern 0 to 7. */
  mask: number;
  /** `modules[y][x]` is true for a dark module. */
  modules: readonly (readonly boolean[])[];
}

export interface QrEncodeOptions {
  /** Error correction level. Default 'M' (about 15% of the code can be damaged). Payment codes on screens use 'M'; printed stickers often 'Q'. */
  errorCorrection?: QrErrorCorrection;
  /** Smallest version to use (1 to 40). Default 1. */
  minVersion?: number;
  /** Largest version to use (1 to 40). Default 40. */
  maxVersion?: number;
  /** Force a mask pattern (0 to 7). Default: the one with the lowest penalty score. */
  mask?: number;
  /** Raise the error correction level when the chosen version has room for it. Default true. */
  boostErrorCorrection?: boolean;
}

const LEVELS: readonly QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];
const FORMAT_BITS: Readonly<Record<QrErrorCorrection, number>> = { L: 1, M: 0, Q: 3, H: 2 };
// Error-correction codewords per block and number of blocks, indexed [level L, M, Q, H][version] (index 0 unused).
// From ISO/IEC 18004 Table 9.
const ECC_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/** Galois field GF(2^8) multiply, reducing by x^8 + x^4 + x^3 + x^2 + 1. */
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j]!, root);
      if (j + 1 < degree) result[j]! ^= result[j + 1]!;
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, i) => { result[i]! ^= gfMultiply(coefficient, factor); });
  }
  return result;
}

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number, level: QrErrorCorrection): number {
  const l = LEVELS.indexOf(level);
  return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[l]![version]! * NUM_BLOCKS[l]![version]!;
}

function alignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

const bitAt = (value: number, i: number): boolean => ((value >>> i) & 1) !== 0;

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** The ISO penalty score of a finished grid (lower scans better). */
function penalty(grid: boolean[][]): number {
  const size = grid.length;
  let score = 0;
  let dark = 0;
  const finder = [true, false, true, true, true, false, true];
  const line = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && get(i) === get(i - 1)) { run++; continue; }
      if (run >= 5) score += run - 2;
      run = 1;
    }
    // 1:1:3:1:1 finder-like pattern with four light modules on one side (outside the grid counts as light).
    const at = (i: number) => i >= 0 && i < size && get(i);
    for (let i = 0; i + 7 <= size; i++) {
      if (!finder.every((v, k) => at(i + k) === v)) continue;
      if ([1, 2, 3, 4].every((k) => !at(i - k)) || [7, 8, 9, 10].every((k) => !at(i + k))) score += 40;
    }
  };
  for (let y = 0; y < size; y++) {
    line((x) => grid[y]![x]!);
    line((x) => grid[x]![y]!);
    for (let x = 0; x < size; x++) {
      if (grid[y]![x]) dark++;
      if (x + 1 < size && y + 1 < size) {
        const c = grid[y]![x];
        if (c === grid[y]![x + 1] && c === grid[y + 1]![x] && c === grid[y + 1]![x + 1]) score += 3;
      }
    }
  }
  const total = size * size;
  return score + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
}

/** Encodes text (UTF-8, byte mode) as a QR code. Throws RangeError when the text does not fit `maxVersion`. */
export function encodeQr(text: string, options: QrEncodeOptions = {}): QrMatrix {
  const { minVersion = 1, maxVersion = 40, boostErrorCorrection = true, mask: forcedMask } = options;
  let level = options.errorCorrection ?? 'M';
  if (!LEVELS.includes(level)) throw new RangeError(`QR error correction must be L, M, Q or H: ${String(level)}`);
  if (!Number.isInteger(minVersion) || !Number.isInteger(maxVersion) || minVersion < 1 || maxVersion > 40 || minVersion > maxVersion) throw new RangeError('QR versions must be whole numbers with 1 <= minVersion <= maxVersion <= 40');
  if (forcedMask !== undefined && (!Number.isInteger(forcedMask) || forcedMask < 0 || forcedMask > 7)) throw new RangeError('QR mask must be 0 to 7');
  const bytes = new TextEncoder().encode(text);
  const bitsNeeded = (version: number) => 4 + (version < 10 ? 8 : 16) + bytes.length * 8;

  let version = minVersion;
  while (bitsNeeded(version) > dataCodewords(version, level) * 8) {
    if (++version > maxVersion) throw new RangeError(`QR: ${bytes.length} bytes do not fit version ${maxVersion} at level ${level}`);
  }
  if (boostErrorCorrection) {
    for (const next of LEVELS.slice(LEVELS.indexOf(level) + 1)) if (bitsNeeded(version) <= dataCodewords(version, next) * 8) level = next;
  }

  // Data bits: mode 0100, count, bytes, terminator, byte padding, then the alternating pad codewords.
  const capacity = dataCodewords(version, level) * 8;
  const bits: number[] = [];
  const push = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(4, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));

  // Split into blocks, add Reed-Solomon codewords, interleave.
  const l = LEVELS.indexOf(level);
  const blockCount = NUM_BLOCKS[l]![version]!;
  const eccLength = ECC_PER_BLOCK[l]![version]!;
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortLength = Math.floor(rawCodewords / blockCount);
  const divisor = rsDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i++) {
    const chunk = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += chunk.length;
    const ecc = rsRemainder(chunk, divisor);
    if (i < shortBlocks) chunk.push(0);
    blocks.push([...chunk, ...ecc]);
  }
  const codewords: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => { if (i !== shortLength - eccLength || j >= shortBlocks) codewords.push(block[i]!); });
  }

  // Function patterns.
  const size = version * 4 + 17;
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const reserved = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const set = (x: number, y: number, dark: boolean) => { grid[y]![x] = dark; reserved[y]![x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  }
  const align = alignmentPositions(version, size);
  align.forEach((ax, i) => align.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask: number) => {
    const value = (FORMAT_BITS[level] << 3) | mask;
    let rem = value;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const format = ((value << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bitAt(format, i));
    set(8, 7, bitAt(format, 6));
    set(8, 8, bitAt(format, 7));
    set(7, 8, bitAt(format, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bitAt(format, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bitAt(format, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bitAt(format, i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const value = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bitAt(value, i));
      set(b, a, bitAt(value, i));
    }
  }

  // Codewords in the zigzag order, two columns at a time from the right, skipping the vertical timing column.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!reserved[y]![x] && i < codewords.length * 8) {
          grid[y]![x] = bitAt(codewords[i >>> 3]!, 7 - (i & 7));
          i++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!reserved[y]![x] && maskBit(mask, x, y)) grid[y]![x] = !grid[y]![x];
  };
  let mask = forcedMask ?? 0;
  if (forcedMask === undefined) {
    let best = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      const score = penalty(grid);
      if (score < best) { best = score; mask = m; }
      applyMask(m);
    }
  }
  applyMask(mask);
  drawFormat(mask);
  return { version, size, errorCorrection: level, mask, modules: grid };
}

/**
 * An SVG path (`d`) drawing every dark module as a unit square, offset by `margin` modules (the quiet zone).
 * Use with `viewBox="0 0 {size + 2 * margin} {size + 2 * margin}"`. Runs of dark modules on a row merge into one rectangle.
 */
export function qrSvgPath(matrix: QrMatrix, margin = 4): string {
  let d = '';
  matrix.modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1]) end++;
      d += `M${x + margin} ${y + margin}h${end - x + 1}v1h${-(end - x + 1)}z`;
      x = end;
    }
  });
  return d;
}
