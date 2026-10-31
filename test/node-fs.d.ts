// The unit tests read two repository files; the package has no @types/node, so declare just this.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function existsSync(path: string): boolean;
}
