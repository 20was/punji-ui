# punji-mcp

An [MCP](https://modelcontextprotocol.io) server (stdio) that helps AI coding agents use `@punji/ui` correctly:
the component catalogue, props and usage notes, the guides, and a static review of code the agent wrote.

**Not yet published.** The package is private (`0.0.0`) and is not a workspace of the root package. Until it is
published, run it from a checkout. Nothing here changes the `@punji/ui` tarball.

## Tools

| Tool | What it does |
| --- | --- |
| `list_components` | Filter by `category` (group id or kind), `stability` (`pre-1.0`, `pattern`) and `search` text. Returns name, subpath import, one-line lead and stability. |
| `get_component` | By slug, title or export name: import line, props tables, when to use or avoid, keyboard, accessibility, the "UI is not enforcement" callout where it applies, examples and related components. |
| `get_guide` | One of `money-rules`, `theming`, `tokens`, `router`, `tables`, `charts`, `security`, `versioning`. |
| `review_usage` | Static checks on a code string (nothing is executed): money passed as a number or float to `bigint` money props, `BigInt()` from floats, root-barrel `@punji/ui` imports (with the subpath to use), `javascript:` / `data:` hrefs, `--pu-*` token overrides. Returns findings with fixes. |

Resources: `punji://llms.txt` and `punji://components/<slug>.md` (one per component).

`review_usage` is regex-level and deliberately small. It does not replace the TypeScript compiler, tests, or
server-side validation. No ESLint plugin exists in this repository yet to reuse; the money-prop table is generated
from the component API (props typed `bigint`).

## Setup

Install the one dependency inside the package (it is deliberately outside the root lockfile):

```sh
cd packages/punji-mcp
npm install
```

### Claude Code

```sh
# today (local checkout, absolute path)
claude mcp add punji -- node /path/to/punji-ui/packages/punji-mcp/bin/punji-mcp.mjs

# once published
claude mcp add punji -- npx punji-mcp
```

### Cursor

`.cursor/mcp.json` (or `~/.cursor/mcp.json`):

```json
{ "mcpServers": { "punji": { "command": "node", "args": ["/path/to/punji-ui/packages/punji-mcp/bin/punji-mcp.mjs"] } } }
```

After publishing, use `"command": "npx", "args": ["punji-mcp"]`.

### VS Code

`.vscode/mcp.json`:

```json
{ "servers": { "punji": { "type": "stdio", "command": "node", "args": ["/path/to/punji-ui/packages/punji-mcp/bin/punji-mcp.mjs"] } } }
```

## Data: offline and version-pinned

The server reads `data/snapshot.json`, committed to the repository, so it needs no network and always matches the
`@punji/ui` version it was generated from (`version` in the snapshot; `get_guide versioning` reports it).

Regenerate after docs or API changes, from the repository root:

```sh
npm run build && npm run site:build        # writes site/dist (components.json, llms.txt, index.md)
node packages/punji-mcp/scripts/build-data.mjs
```

`build-data.mjs` prefers the site build outputs. Without `site/dist` it falls back to the site registry sources
(and `site/src/generated/api.json` if `site:gen` has run; otherwise there are no props tables) and says so.
Component stability is not tracked per component in the registry yet: library components report `pre-1.0`, copy-in
showcases and apps report `pattern`.

## Tests

Handler tests run from the repository root with the rest of vitest (no network, no SDK needed):

```sh
npx vitest run packages
```

The in-memory transport wiring test runs only when the SDK is installed in this package (`npm install` above);
otherwise it is skipped.

## Dependencies

`@modelcontextprotocol/sdk` 1.32.2 (MIT, published 2026-10-23) and `zod` 4.6.7 (MIT), both pinned exactly.
