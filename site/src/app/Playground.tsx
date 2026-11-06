import { createElement, useEffect, useId, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import type { PlaygroundControl, PlaygroundDef } from '../playground.ts';
import type { ApiEntry } from './api.ts';
import { Code } from './Code.tsx';
import { LocaleScope } from './PreviewScope.tsx';
import { usePreviewPrefs } from './preview.ts';

type Value = string | number | boolean | undefined;

export interface Field {
  name: string;
  kind: 'boolean' | 'text' | 'number' | 'select';
  options: readonly (string | number)[];
  initial: Value;
  description: string;
}

const literal = /^(?:"([^"]*)"|'([^']*)'|(-?\d+(?:\.\d+)?))$/;

/** The members of a union of string or number literals ('"a" | "b"', '2 | 3'), or undefined if the type is anything else. */
export function literalUnion(type: string): (string | number)[] | undefined {
  const parts = type.split('|').map((p) => p.trim());
  const out: (string | number)[] = [];
  for (const part of parts) {
    const m = literal.exec(part);
    if (!m) return undefined;
    out.push(m[3] !== undefined ? Number(m[3]) : (m[1] ?? m[2] ?? ''));
  }
  return out.length > 0 ? out : undefined;
}

/** The control a prop's API type calls for: boolean, a select over its literals (or over an alias the page documents), number or text. */
export function fieldFor(name: string, control: PlaygroundControl | true, api: Record<string, ApiEntry>, entry: ApiEntry): Field | undefined {
  const row = entry.props?.find((p) => p.name === name);
  if (!row) return undefined;
  const override = control === true ? {} : control;
  const type = row.type.replace(/\s*\|\s*(?:undefined|null)\b/g, '').trim();
  let kind = override.kind;
  let options = override.options ?? [];
  if (!kind && override.options) kind = 'select';
  if (!kind) {
    const members = literalUnion(type) ?? literalUnion(api[type]?.definition ?? '');
    if (type === 'boolean') kind = 'boolean';
    else if (type === 'number') kind = 'number';
    else if (type === 'string') kind = 'text';
    else if (members) {
      kind = 'select';
      options = override.options ?? members;
    }
  }
  if (!kind || (kind === 'select' && options.length === 0)) return undefined;
  return { name, kind, options, initial: override.initial, description: row.description };
}

const quoted = (text: string) => (/["{}<>\n\\]/.test(text) ? `{${JSON.stringify(text)}}` : `"${text}"`);

/** The JSX for the current values: the import, then the element. Only props that differ from "unset" appear. */
export function snippetFor(def: PlaygroundDef, entry: ApiEntry, fields: readonly Field[], values: Record<string, Value>, text: string): string {
  const attrs: string[] = [];
  const state: string[] = [];
  for (const f of fields) {
    const handler = def.bind?.[f.name];
    const v = values[f.name];
    if (handler) {
      const setter = `set${f.name[0]!.toUpperCase()}${f.name.slice(1)}`;
      state.push(`const [${f.name}, ${setter}] = useState(${String(v ?? false)});`);
      attrs.push(`${f.name}={${f.name}}`, `${handler}={${setter}}`);
    } else if (f.kind === 'boolean') {
      if (v) attrs.push(f.name);
    } else if (v !== undefined && v !== '') {
      attrs.push(typeof v === 'number' || f.kind === 'number' ? `${f.name}={${String(v)}}` : `${f.name}=${quoted(String(v))}`);
    }
  }
  const tag = def.component;
  const open = attrs.length > 3 ? `<${tag}\n${attrs.map((a) => `  ${a}`).join('\n')}\n` : `<${tag}${attrs.map((a) => ` ${a}`).join('')}`;
  const element = def.children !== undefined ? `${open}>${text.includes('\n') ? '' : text}</${tag}>` : `${open}${attrs.length > 3 ? '' : ' '}/>`;
  return `import { ${tag} } from '${entry.module}';\n\n${state.length ? `${state.join('\n')}\n\n` : ''}${element}\n`;
}

function Playground({ def, entry, api }: { def: PlaygroundDef; entry: ApiEntry; api: Record<string, ApiEntry> }) {
  const id = useId();
  const prefs = usePreviewPrefs();
  const fields = useMemo(() => Object.entries(def.props).flatMap(([name, control]) => fieldFor(name, control, api, entry) ?? []), [def, api, entry]);
  const [values, setValues] = useState<Record<string, Value>>(() => Object.fromEntries(fields.map((f) => [f.name, f.initial ?? (f.kind === 'boolean' ? false : undefined)])));
  const [text, setText] = useState(def.children ?? '');
  const [Component, setComponent] = useState<ComponentType<Record<string, unknown>>>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    def.load().then(
      (mod) => live && setComponent(() => mod[def.component] as ComponentType<Record<string, unknown>>),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [def]);

  const set = (name: string, value: Value) => setValues((prev) => ({ ...prev, [name]: value }));
  const props: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (v !== undefined && v !== '') props[f.name] = v;
    const handler = def.bind?.[f.name];
    if (handler) props[handler] = (next: unknown) => set(f.name, next as Value);
  }
  const children: ReactNode = def.children !== undefined ? text : undefined;
  const reset = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.name, f.initial ?? (f.kind === 'boolean' ? false : undefined)])));
    setText(def.children ?? '');
  };

  return (
    <div className="doc-play" data-testid="playground">
      <form className="doc-play-controls" aria-label={`${entry.name} props`} onSubmit={(e) => e.preventDefault()}>
        {def.children !== undefined && (
          <label className="doc-play-field" htmlFor={`${id}-children`}>
            <span>children</span>
            <input id={`${id}-children`} type="text" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        )}
        {fields.map((f) => {
          const fid = `${id}-${f.name}`;
          const v = values[f.name];
          if (f.kind === 'boolean')
            return (
              <label key={f.name} className="doc-play-field is-check" htmlFor={fid}>
                <input id={fid} type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} />
                <span>{f.name}</span>
              </label>
            );
          return (
            <label key={f.name} className="doc-play-field" htmlFor={fid}>
              <span>{f.name}</span>
              {f.kind === 'select' ? (
                <select
                  id={fid}
                  value={v === undefined ? '' : String(v)}
                  onChange={(e) => set(f.name, e.target.value === '' ? undefined : typeof f.options[0] === 'number' ? Number(e.target.value) : e.target.value)}
                >
                  <option value="">(default)</option>
                  {f.options.map((o) => (
                    <option key={o} value={String(o)}>
                      {String(o)}
                    </option>
                  ))}
                </select>
              ) : f.kind === 'number' ? (
                <input id={fid} type="number" inputMode="decimal" value={v === undefined ? '' : String(v)} onChange={(e) => set(f.name, e.target.value === '' ? undefined : Number(e.target.value))} />
              ) : (
                <input id={fid} type="text" value={v === undefined ? '' : String(v)} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </label>
          );
        })}
        <button type="button" className="doc-preview-reset" onClick={reset}>
          Reset props
        </button>
      </form>
      <div className="doc-stage" data-theme={prefs.theme ?? undefined} data-pu-density={prefs.density}>
        <div className="doc-stage-in" role="region" aria-label={`${entry.name} live preview`} data-testid="playground-preview">
          {failed ? (
            <p className="doc-p" role="status">
              The component did not load. Reload the page to try again.
            </p>
          ) : Component ? (
            <LocaleScope locale={prefs.locale}>{createElement(Component, props, children)}</LocaleScope>
          ) : null}
        </div>
      </div>
      <Code label={`${entry.name} playground code`} title="JSX" lang="tsx" code={snippetFor(def, entry, fields, values, text)} />
    </div>
  );
}

export default Playground;
