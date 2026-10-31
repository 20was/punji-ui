/** Pure checks for a file a person picked, shared by StatementUpload and usable on their own. No React, no network. */

export type StatementRejectionReason = 'type' | 'size' | 'empty' | 'duplicate' | 'count';

export interface StatementFileInfo { name: string; size: number; type?: string }
export interface StatementFileRules {
  /** Extensions (".csv") and MIME types ("application/pdf", "text/*"), like the HTML accept attribute. */
  accept: readonly string[];
  /** Largest size in bytes. */
  maxSize: number;
}

/** Whether a file matches the accept list: an extension (case-insensitive) or a MIME type, with "type/*" wildcards. */
export function matchesAccept(file: StatementFileInfo, accept: readonly string[]): boolean {
  const name = file.name.toLowerCase();
  const mime = (file.type ?? '').toLowerCase();
  return accept.some((entry) => {
    const rule = entry.trim().toLowerCase();
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
    return mime !== '' && mime === rule;
  });
}

/** The first reason a file cannot be used, or null when it can. The browser's type is a hint: a server must check the content. */
export function validateStatementFile(file: StatementFileInfo, rules: StatementFileRules): StatementRejectionReason | null {
  if (!matchesAccept(file, rules.accept)) return 'type';
  if (file.size === 0) return 'empty';
  if (file.size > rules.maxSize) return 'size';
  return null;
}

const unit = (value: number, suffix: string) => `${String(Math.round(value * 10) / 10)} ${suffix}`;
/** A short size in bytes, kilobytes or megabytes (1 KB is 1024 bytes): "812 B", "14.2 KB", "5 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError('A file size must be a non-negative number');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return unit(bytes / 1024, 'KB');
  if (bytes < 1024 ** 3) return unit(bytes / 1024 ** 2, 'MB');
  return unit(bytes / 1024 ** 3, 'GB');
}

/** "CSV or PDF" from [".csv", ".pdf"]; MIME entries are shown as written. */
export function describeAccept(accept: readonly string[]): string {
  const names = accept.map((entry) => (entry.startsWith('.') ? entry.slice(1).toUpperCase() : entry));
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}
