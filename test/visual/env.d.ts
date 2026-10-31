declare module '*.css';
declare module 'node:fs' { export function readFileSync(path: string, encoding: 'utf8'): string }
declare module 'node:module' { export function createRequire(url: string): { resolve(id: string): string } }
declare const process: { env: Record<string, string | undefined> };
interface ImportMeta { readonly url: string }
