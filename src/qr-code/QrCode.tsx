/**
 * QrCode: draws text as a QR code in one SVG path, with no dependency. Dark modules on a light background with a
 * quiet zone, whatever the page theme, because many scanners cannot read an inverted code. It is an image with a
 * name ("QR code to pay Himalayan Momo"); the encoded text is not exposed, so pass a readable alternative (the
 * merchant, the amount) nearby. No hooks, so it renders on the server.
 */
import type { CSSProperties } from 'react';

import { encodeQr, qrSvgPath, type QrErrorCorrection } from './matrix.ts';

export { encodeQr, qrSvgPath } from './matrix.ts';
export type { QrEncodeOptions, QrErrorCorrection, QrMatrix } from './matrix.ts';

export interface QrCodeProps {
  /** The text to encode (an EMVCo payload, a URL). UTF-8, byte mode. Too long for version 40 throws a RangeError. */
  value: string;
  /** The image's accessible name. Default "QR code". Say what scanning it does: "QR code to pay Himalayan Momo". */
  label?: string;
  /** Error correction level. Default 'M'. Use 'Q' or 'H' when a logo covers the middle or the code is printed small. */
  errorCorrection?: QrErrorCorrection;
  /** Rendered width and height in CSS pixels (or any CSS length). Default 200. Keep it at least 2 cm on a phone screen. */
  size?: number | string;
  /** Quiet zone in modules on each side. Default 4 (the standard minimum); lower only inside a white card that gives the space. */
  margin?: number;
  /** Module colour. Default '#000000'. Keep strong contrast with `background`. */
  foreground?: string;
  /** Background colour. Default '#ffffff'. `transparent` drops it; only do so on a light surface. */
  background?: string;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}

export function QrCode({ value, label = 'QR code', errorCorrection = 'M', size = 200, margin = 4, foreground = '#000000', background = '#ffffff', className, style, testId }: QrCodeProps) {
  if (!Number.isInteger(margin) || margin < 0 || margin > 16) throw new RangeError('QrCode margin must be a whole number from 0 to 16');
  const matrix = encodeQr(value, { errorCorrection });
  const box = matrix.size + margin * 2;
  return (
    <svg
      className={className ? `pu-qr ${className}` : 'pu-qr'}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      data-version={matrix.version}
      data-testid={testId}
      style={style}
    >
      {background !== 'transparent' && <rect width={box} height={box} fill={background} />}
      <path d={qrSvgPath(matrix, margin)} fill={foreground} />
    </svg>
  );
}
