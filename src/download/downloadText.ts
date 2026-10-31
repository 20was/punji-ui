import { safeFilename } from '../export/filename.ts';

/** Browser-only: save text as a file through an object URL. Call from a user gesture
 * (click handler), never during render or on the server. The file name is sanitised and
 * the object URL is revoked shortly after the click. Nothing is sent over the network.
 */
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') throw new Error('downloadText needs a browser.');
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename(filename);
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
