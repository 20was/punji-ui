// The unit tests read two repository files; the package has no @types/node, so declare just this.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function existsSync(path: string): boolean;
}
declare module 'node:child_process' {
  export function execFileSync(file: string, args?: readonly string[], options?: { encoding: 'utf8'; cwd?: string }): string;
}
