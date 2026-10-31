declare const process: { env?: { NODE_ENV?: string } } | undefined;

/** Development-only diagnostics. Messages must never include user or financial data. */
export function devWarn(message: string): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  console.error(`@punji/ui: ${message}`);
}
