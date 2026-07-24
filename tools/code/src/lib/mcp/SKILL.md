---
name: Code Skill
description: >
  Use when scaffolding apps, domain libraries, domains, MCP servers, Keycloak themes, or native apps.
  Prefer the code MCP tools (code_list_generators, code_generator_schema, code_generate) over hand-rolled layout.
---

# Code Skill

Prefer the **code MCP** (or `nx generate @forepath/code:…`) over hand-creating `project.json`, `apps/` trees, or `libs/domains/` layout when a generator exists.

## Operating rules

1. **Generators first** — do not copy templates from sibling projects when `@forepath/code` has a generator.
2. **MCP first** — call `code_list_generators` → `code_generator_schema` → `code_generate` instead of guessing flags.
3. **Schema is source of truth** — always read the generator schema (via MCP or `tools/code/src/generators/<name>/schema.json`) before generating.
4. **Confirm mutations** — `code_generate` requires `confirm: true` to write files; use `dryRun: true` to preview.
5. **Domain before apps** — if `apps/<domain>/` or `libs/domains/<domain>/` does not exist, run `@forepath/code:domain` first.
6. **Capture Nx output once** — follow the nx-cli skill; persist logs under `tmp/nx-agent/` instead of re-running.
7. **`init` is heavyweight** — only run when intentionally bootstrapping agent/repo wiring.

## MCP tools (preferred)

| Tool                    | Use                                                                     |
| ----------------------- | ----------------------------------------------------------------------- |
| `code_list_generators`  | Names + descriptions (`backend`, `frontend`, `lib`, `domain`, `mcp`, …) |
| `code_generator_schema` | JSON schema for one generator                                           |
| `code_generate`         | Run `nx generate @forepath/code:<name>` (`confirm=true` to mutate)      |

Launch:

```bash
nx run code:mcp
# or
node tools/code/mcp-run.cjs
```

CLI equivalents:

```bash
nx generate @forepath/code:backend <name> --domain=<domain>
nx generate @forepath/code:frontend <name> --domain=<domain>
nx generate @forepath/code:lib <name> --domain=<domain> --scope=<scope> --type=<type>
nx generate @forepath/code:domain <name>
nx generate @forepath/code:mcp <name> --domain=<domain>
```

## Naming and layout (what generators produce)

**Applications** (`backend`, `frontend`, `native`, `mcp`, `keycloak-theme`):

- Path: `apps/<domain>/<role>-<name>`
- Nx project name: `<domain>-<role>-<name>`
- Role prefixes: `backend-`, `frontend-`, `native-`, `mcp-`, `keycloak-theme-`

**Domain libraries** (`lib`):

- Path: `libs/domains/<domain>/<scope>/<type>-<name>`
- Nx project name: `<domain>-<scope>-<type>-<name>`
- Import path: `@forepath/<domain>/<scope>/<type>-<name>`

Respect Nx tags (`domain:*`, `scope:*`, `type:*`) and module boundaries set by the generators.

## When to use

- New Nest/Angular/Electron/Keycloak/MCP apps under a domain
- New domain stubs or domain libraries
- Repo init via `@forepath/code:init` (rare)

## Related

- Package README: `tools/code/README.md`
- Skill source: `tools/code/src/lib/mcp/SKILL.md` (MCP prompt/resource; Cursor/OpenCode dual-publish thin stubs)
- Broader generator checklist: `forepath-generators` skill (still under `.agenstra/skills/`)
- Agent context transform: **ai** MCP skill / `ai_*` tools (not this skill)
