import generated from '../generated/api.json';

export interface PropRow {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

export interface ApiEntry {
  name: string;
  module: string;
  description: string;
  kind: 'component' | 'function' | 'constant' | 'type';
  props?: PropRow[];
  inherited?: boolean;
  signature?: string;
  definition?: string;
}

const api = generated as Record<string, ApiEntry>;

export function apiEntry(name: string): ApiEntry {
  const entry = api[name];
  // site-gen.mjs fails the build first if a registered entry is missing; this is the second line of defence.
  if (!entry) throw new Error(`No generated API entry for ${name}. Run npm run site:gen.`);
  return entry;
}
