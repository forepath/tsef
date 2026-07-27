# AI Agents Context (.agenstra)

Guides for AI coding assistants working on **Decabill** in this monorepo. Includes the workspace `.agenstra/` agent context (duplicated here for convenience) plus Decabill-specific orientation.

## Overview

The `.agenstra/` context is a **single source of truth** for agent rules, commands, skills, agents, and tools. The `@forepath/ai` transformer reads this directory and emits tool-specific configs so you can maintain one set of files and generate Cursor, OpenCode, and GitHub Copilot output as needed.

**Key characteristics**:

- **Tool-agnostic** No vendor-specific syntax in the source files
- **Composable** Rules, commands, skills, and agents are separate and reusable
- **Versionable** Commit `.agenstra/` to git and share across the team
- **Transform on demand** Generate tool configs with `nx` or the transformer API

## Directory Structure

```
.agenstra/
├── metadata.json          # Project metadata (required: version, appName; optional: description). Only appName is passed to context.
├── rules/                 # Instruction-based rules (.mdc)
├── commands/              # Reusable prompts (.command.mdc)
├── skills/                # Reusable skill docs (.skill.mdc)
├── agents/                # Primary agent configs (.agent.mdc)
├── subagents/             # Subagent configs (.subagent.mdc)
├── mcp-definitions/       # MCP server definitions (JSON) → Cursor/OpenCode/Copilot MCP config
└── overrides/             # Manual overrides (copied last, can overwrite generated content)
    ├── .cursor/           # Cursor-specific overrides
    ├── .opencode/         # OpenCode-specific overrides
    ├── .github/           # GitHub Copilot instruction overrides
    ├── .vscode/           # GitHub Copilot MCP overrides (.vscode/mcp.json)
    ├── AGENTS.md          # Override OpenCode AGENTS.md
    └── opencode.json      # Override OpenCode config
```

## Components

### [Rules](./rules.md)

Project-wide instructions (coding standards, architecture, testing, security). Stored as **MDC** (`.mdc`) in `rules/`. Transformed into Cursor rules (`.mdc`), OpenCode `AGENTS.md` (aggregated), and GitHub Copilot repository instructions.

### [Commands](./commands.md)

Reusable slash-style commands with prompts and optional agent binding. Stored as **MDC** (`.command.mdc`) in `commands/` (YAML frontmatter + body as prompt). Transformed into Cursor commands (`.md`) and OpenCode commands (`.md` with frontmatter). The transformer does not emit commands for GitHub Copilot; configure Copilot separately if needed.

### [Skills](./skills.md)

Domain-specific knowledge (patterns, best practices) as **MDC** (`.skill.mdc`) in `skills/`. Tools that support skills get them as separate skill folders (`SKILL.md`); legacy merge into instructions is unused for current targets.

### [Knowledge graph](./knowledge-graph.md)

Pre-computed monorepo map at `graph/graph.json` (projects, OpenAPI/AsyncAPI, docs concepts). Regenerated and staged on pre-commit. Includes **Decabill-specific** graph recipes (`domain:decabill`).

### [Agents](./agents.md)

Primary agents and subagents defined as **MDC** (YAML frontmatter + body) in `agents/` (`.agent.mdc`) and `subagents/` (`.subagent.mdc`). Frontmatter includes id, name, description, mode, temperature, model, tools; body is the prompt/instructions. Transformed into Cursor agents (`.md`), OpenCode agents (`.md`), and GitHub Copilot custom agents (`.github/agents/<id>.agent.md`).

### [MCP definitions](./mcp-definitions.md)

MCP server definitions (local command or remote URL) in `mcp-definitions/`. Transformed into Cursor `.cursor/mcp.json`, OpenCode `opencode.json` (`mcp` object), and GitHub Copilot `.vscode/mcp.json` (`servers` object). Workspace servers: `ai`, `code`, `knowledge-graph`.

### [agentctx](./agentctx.md)

CLI to validate and transform `.agenstra/` without depending on Nx.

### Overrides

Manual overrides in `overrides/` are copied to the output directory **after** transformation, allowing you to overwrite or extend auto-generated content. Override structure mirrors the output structure:

- `.agenstra/overrides/.cursor/...` → copied to `outputDir/.cursor/...` (Cursor)
- `.agenstra/overrides/.opencode/...` → copied to `outputDir/.opencode/...` (OpenCode)
- `.agenstra/overrides/AGENTS.md` → copied to `outputDir/AGENTS.md` (OpenCode)
- `.agenstra/overrides/opencode.json` → copied to `outputDir/opencode.json` (OpenCode)
- `.agenstra/overrides/.github/...` → copied to `outputDir/.github/...` (GitHub Copilot)
- `.agenstra/overrides/.vscode/...` → copied to `outputDir/.vscode/...` (GitHub Copilot MCP)

## Generating tool configs

After editing `.agenstra/`, generate output for one or more tools:

**Via agentctx** Use the **agentctx** CLI binary built from `tools/ai`; see [agentctx](./agentctx.md) for install and usage.

**Via Nx** (if the project has an `agenstra-transform` target):

```bash
nx run my-app:agenstra-transform --target=cursor,opencode,github-copilot --outputDir=generated
```

**Via API**:

```ts
import { transform } from '@forepath/ai';

transform({
  source: '.agenstra',
  target: ['cursor', 'opencode', 'github-copilot'],
  outputDir: 'generated',
  dryRun: false,
});
```

Output is written under `outputDir/` using standard directory names: `outputDir/.cursor/`, `outputDir/.opencode/`, `outputDir/.github/` (plus OpenCode `AGENTS.md` and `opencode.json` at the output root). Copy or symlink into your project root as needed (e.g. `generated/.cursor` → `.cursor`).

---

## Decabill product snapshot

Decabill is ForePath billing: subscriptions, invoices, payments, admin, multi-tenancy, optional provisioning, and project boards.

Primary deployables:

| Nx project                          | Root                                     | Role                            |
| ----------------------------------- | ---------------------------------------- | ------------------------------- |
| `decabill-backend-billing-manager`  | `apps/decabill/backend-billing-manager`  | NestJS API, jobs, WebSockets    |
| `decabill-frontend-billing-console` | `apps/decabill/frontend-billing-console` | Angular SSR customer + admin UI |
| `decabill-frontend-landingpage`     | `apps/decabill/frontend-landingpage`     | Marketing / pricing site        |
| `decabill-frontend-docs`            | `apps/decabill/frontend-docs`            | Docs site                       |

Domain feature libraries (logic and specs live here):

| Nx project                                      | Root                                                         |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `decabill-backend-feature-billing-manager`      | `libs/domains/decabill/backend/feature-billing-manager`      |
| `decabill-frontend-feature-billing-console`     | `libs/domains/decabill/frontend/feature-billing-console`     |
| `decabill-frontend-data-access-billing-console` | `libs/domains/decabill/frontend/data-access-billing-console` |
| `decabill-frontend-feature-landingpage`         | `libs/domains/decabill/frontend/feature-landingpage`         |
| `decabill-frontend-data-access-portal`          | `libs/domains/decabill/frontend/data-access-portal`          |

API contracts (canonical):

- OpenAPI: `libs/domains/decabill/backend/feature-billing-manager/spec/openapi.yaml`
- AsyncAPI: `libs/domains/decabill/backend/feature-billing-manager/spec/asyncapi.yaml`
- Human guide: [API Reference](../api-reference/README.md)

## How agents should work on Decabill

1. **Prefer the knowledge graph** before wide repo scans. Start with `domain:decabill` and key projects above. See [Knowledge graph](./knowledge-graph.md) (Decabill recipes at the end).
2. **Read product docs** under `docs/decabill/` for behavior (features, multi-tenancy, auth, deployment). Do not invent tenant or billing semantics.
3. **Follow workspace rules** from `.agenstra/` (NestJS, Angular, security, testing). Domain tags: `domain:decabill`, `scope:backend` / `scope:frontend`.
4. **Keep API and UI aligned**: change OpenAPI/AsyncAPI with backend surfaces; keep frontend types/services in sync with those contracts.
5. **Respect multi-tenancy**: tenant context (`X-Tenant`, guards, tenant-scoped queries). See [Multi-tenancy](../features/multi-tenancy.md) and [Authentication](../features/authentication.md).
6. **Use Nx from the monorepo root** and capture output under `tmp/nx-agent/` (nx-cli skill). Typical targets: `decabill-backend-billing-manager`, `decabill-frontend-billing-console`.

## Related documentation

- [Architecture](../architecture/README.md) System architecture overview
- [Applications](../applications/README.md) Billing console and billing manager apps
- [Features](../features/README.md) Product capability index
- [Deployment](../deployment/README.md) Local, Docker, and production guides
- [Security](../security/README.md) Compliance, hardening, and disclosure
- [Troubleshooting](../troubleshooting/README.md) Common issues and debugging

---

_For detailed component schemas and examples, see the individual documentation pages._
