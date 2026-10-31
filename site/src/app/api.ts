// The shape of site/src/generated/api.json. A page's entries arrive with its page data (load.ts), never the whole file.
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

/** A page's entry by name. site-gen.mjs fails the build first if a registered entry is missing; this is the second line of defence. */
export function apiEntryIn(entries: Record<string, ApiEntry>, name: string): ApiEntry {
  const entry = entries[name];
  if (!entry) throw new Error(`No generated API entry for ${name}. Run npm run site:gen.`);
  return entry;
}
