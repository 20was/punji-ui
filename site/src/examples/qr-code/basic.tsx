import { QrCode, encodeQr } from '@punji/ui/qr-code';
import { Cluster } from '@punji/ui/stack';

const text = 'https://design.punji.app/components/qr-code';

export default function Example() {
  const low = encodeQr(text, { errorCorrection: 'L', boostErrorCorrection: false });
  const high = encodeQr(text, { errorCorrection: 'H' });
  return (
    <Cluster gap={4} justify="center">
      <figure style={{ margin: 0, textAlign: 'center' }}>
        <QrCode value={text} errorCorrection="L" label="QR code linking to the QrCode page, level L" size={160} />
        <figcaption className="doc-muted">Level L, version {low.version}</figcaption>
      </figure>
      <figure style={{ margin: 0, textAlign: 'center' }}>
        <QrCode value={text} errorCorrection="H" label="QR code linking to the QrCode page, level H" size={160} />
        <figcaption className="doc-muted">Level H, version {high.version}</figcaption>
      </figure>
    </Cluster>
  );
}
