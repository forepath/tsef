# Knowledge Graph

The monorepo knowledge graph helps humans and AI agents understand structure without repeatedly scanning every source file.

## Why it exists

Large Nx workspaces span many apps and libs. The graph unifies:

- Nx **project** dependencies (`app` / `lib` / `tool`)
- Production **npm packages** attributed per app via Nx `createPackageJson` (SBOM-equivalent)
- **patch-package** files under `patches/` when they target an attributed package
- **OpenAPI** / **AsyncAPI** operations and channels
- **Markdown** concepts under `docs/<domain>/`
- Heuristic **implements** links from Nest controllers to OpenAPI paths and gateways to AsyncAPI channels
- Architectural sources: controllers, gateways, jobs, services, repositories, entities, DTOs, guards, modules, domain providers, accumulated NgRx `state` slices, email templates, and webhook events

Artifacts live at:

| File               | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `graph/graph.json` | Machine-readable nodes and edges                    |
| `graph/graph.html` | Local debugger UI (serve with `nx run graph:serve`) |

## How to generate

From the workspace root:

```bash
nx run graph:generate-kg
```

This builds `@forepath/graph` (if needed) and writes `graph/graph.json` and `graph/graph.html`.

Also available as:

```bash
nx generate @forepath/graph:generate-kg
```

### View in the browser

```bash
nx run graph:serve
```

Opens a static server on [http://127.0.0.1:4211/](http://127.0.0.1:4211/) (serves the `graph/` directory). Use `--port` / `--dir` after `--` if needed.

### Pre-commit

The Husky `pre-commit` hook regenerates the graph on every commit and stages the artifacts:

```bash
nx run graph:generate-kg
git add graph/graph.json graph/graph.html
```

Committed graph files are therefore kept current without a separate manual step.

## Schema overview

- **Nodes:** `app`, `lib`, `tool`, `package`, `patch`, `domain`, `context`, `feature-group`, `controller`, `gateway`, `job`, `service`, `repository`, `entity`, `dto`, `guard`, `module`, `state`, `provider`, `email`, `webhook-event`, `doc`, `readme`, `openapi`, `asyncapi`, `diagram`, `endpoint`, `concept`
- **Edges:** `depends_on`, `contains`, `implements`, `documents`, `belongs_to`

See the **Knowledge Graph Skill** (`tools/graph/src/lib/mcp/SKILL.md`, also the `graph` MCP prompt) for id patterns and traversal recipes.

## Using the graph with AI tools

1. Load the **Knowledge Graph Skill** via the knowledge-graph MCP prompt `graph` (source: `tools/graph/src/lib/mcp/SKILL.md`).
2. Prefer the **knowledge-graph MCP** (`.agenstra/mcp-definitions/knowledge-graph.mcp.json` → Cursor `.cursor/mcp.json`) — tools `graph_r1`, `graph_docs`, `graph_endpoint`, `graph_search`, `graph_impact`, `graph_mentions`.
3. Or use the CLI: `nx run graph:query -- r1 <project>`, `nx run graph:impact -- --base main`, `nx run graph:query -- mentions <project>`.
4. Do **not** paste all of `graph/graph.json` into context; recipe tools return compact neighborhoods.
5. Optionally open `graph/graph.html` via `nx run graph:serve` for visual inspection.
6. Fall back to source under each project's `root` when edges are missing.
7. Use `graph_mentions` when you need textual consumers that are not declared Nx `depends_on` edges.

Build the MCP/CLI entrypoints after graph tool changes (or let the launcher build on first start):

```bash
nx run graph:build
# or: node tools/graph/mcp-run.cjs  # builds dist if missing, then starts MCP
```

## Security

The generator indexes **paths and API metadata only**. It skips sensitive path names (for example `.env*`, `*secret*`, `*credential*`) and does not embed environment values, tokens, or encrypted secrets into `graph.json`.

`__fixtures__`, `.angular`, and `.cache` directories are skipped during discovery so test sandboxes and build caches do not pollute blast-radius results. `graph_mentions` also omits bare tokens shorter than 8 characters and ignores cache/fixture hit paths.

## Implementation

Plugin package: `tools/graph` (`@forepath/graph`), sublicensed under AGPL-3.0.

---

# Decabill-specific recipes

How to use the graph when changing **Decabill**. Prefer these recipes after the workspace overview above.

## Why Decabill-specific notes

Decabill spans several Nx apps and libs, a large OpenAPI surface, AsyncAPI channels, jobs, and many `docs/decabill/` concepts. Agents should query `domain:decabill` and named projects instead of loading `graph/graph.json` or grepping the whole tree.

## Prefer MCP tools

1. Load the **Knowledge Graph Skill** via MCP prompt `graph` / resource `skill://graph` (source: `tools/graph/src/lib/mcp/SKILL.md`).
2. Use the **knowledge-graph** MCP: `graph_r1`, `graph_docs`, `graph_endpoint`, `graph_search`, `graph_impact`, `graph_mentions`.
3. Or CLI: `nx run graph:query -- …`, `nx run graph:impact -- --base main`.
4. Do **not** paste all of `graph/graph.json` into context.

## Recipes for Decabill

### Orient on the domain (R7-style)

```text
graph_search keyword=domain:decabill
```

Then follow incoming `belongs_to` mentally via project hits, or run R1 on the projects you care about.

### Before editing a Decabill project (R1)

```text
graph_r1 project=decabill-backend-feature-billing-manager
graph_r1 project=decabill-frontend-data-access-billing-console
graph_r1 project=decabill-backend-billing-manager
```

Use `endpointCount`, `channelCount`, `documentCount`, and `containsTotals`. Treat listed endpoints/docs as samples.

Useful project names:

| Project                                         | When                                          |
| ----------------------------------------------- | --------------------------------------------- |
| `decabill-backend-feature-billing-manager`      | Entities, controllers, OpenAPI/AsyncAPI, jobs |
| `decabill-backend-billing-manager`              | App shell, queue wiring, deployable           |
| `decabill-frontend-data-access-billing-console` | HTTP services, NgRx state, API callers        |
| `decabill-frontend-feature-billing-console`     | UI pages and routes                           |
| `decabill-frontend-billing-console`             | App bootstrap / environment                   |

### Before changing an HTTP path or channel (R3)

```text
graph_endpoint method=GET path=/api/...
# or
graph_endpoint channel=<asyncapi-channel-name>
```

Owner specs live under:

- `libs/domains/decabill/backend/feature-billing-manager/spec/openapi.yaml`
- `libs/domains/decabill/backend/feature-billing-manager/spec/asyncapi.yaml`

### Docs linked to a project (R2)

```text
graph_docs project=decabill-backend-billing-manager
graph_docs project=decabill-backend-feature-billing-manager
```

Concepts resolve to paths under `docs/decabill/`.

### Diff blast radius

```text
graph_impact  # uncommitted, or baseRef=main
```

Filter ownership to `apps/decabill/**` and `libs/domains/decabill/**` (and shared libs those projects depend on).

### Soft references

```text
graph_mentions project=decabill-backend-feature-billing-manager
```

Use after R1 when string/copy-paste consumers matter (for example other frontends that reuse billing console patterns).

## Approximate surface size (orientation)

From a typical R1 on `decabill-backend-feature-billing-manager` (counts change as the tree evolves):

- Large HTTP surface (`endpointCount` often 100+)
- Multiple AsyncAPI channels
- Controllers, entities, DTOs, repositories, jobs, emails, webhook events

Do not treat these numbers as fixed; re-query when planning a change.

## After graph tool changes

```bash
nx run graph:build
# or: node tools/graph/mcp-run.cjs
```

Regenerate artifacts when structure changed and the task depends on a fresh map:

```bash
nx run graph:generate-kg
```

## Related

- [AI Agents overview](./README.md)
- [API Reference](../api-reference/README.md)
- [Rules](./rules.md) / [Skills](./skills.md) / [MCP definitions](./mcp-definitions.md)
