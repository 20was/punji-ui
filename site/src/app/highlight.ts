// A deliberately small TSX tokenizer (about 40 lines) so the docs ship no
// syntax-highlighting dependency. It colours; it never changes the text, and
// the concatenation of all token texts is always exactly the input.

export type TokenKind = 'comment' | 'string' | 'number' | 'keyword' | 'tag' | 'fn' | 'plain';
export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'of', 'in', 'while', 'new', 'type', 'interface',
  'default', 'as', 'typeof', 'null', 'undefined', 'true', 'false', 'async', 'await', 'throw', 'try', 'catch', 'extends', 'satisfies', 'void',
]);

// Order matters: comments and strings first so their contents are never re-tokenized.
const PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\[\s\S])*`)|(<\/?[A-Za-z][\w.]*)|(\b\d[\d_]*(?:\.\d+)?n?\b)|([A-Za-z_$][\w$]*)(?=\s*[(<])|([A-Za-z_$][\w$]*)/g;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  const push = (kind: TokenKind, text: string) => {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.kind === kind) prev.text += text;
    else tokens.push({ kind, text });
  };
  for (const match of source.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    push('plain', source.slice(last, start));
    const [text, comment, string, tag, number, call, word] = match;
    if (comment) push('comment', text);
    else if (string) push('string', text);
    else if (tag) push('tag', text);
    else if (number) push('number', text);
    else if (call) push(KEYWORDS.has(call) ? 'keyword' : 'fn', text);
    else if (word) push(KEYWORDS.has(word) ? 'keyword' : 'plain', text);
    last = start + text.length;
  }
  push('plain', source.slice(last));
  return tokens;
}
