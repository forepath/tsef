---
name: AI Skill
description: >
  Use when validating or transforming .agenstra agent context for Cursor, OpenCode, or GitHub Copilot.
  Prefer the ai MCP tools (ai_validate, ai_read_context, ai_transform) over hand-editing generated configs.
---

# AI Skill

Prefer the **ai MCP** (or `agentctx` / `@forepath/ai` APIs) over hand-editing `.cursor/`, `.opencode/`, or Copilot instruction files that are generated from `.agenstra/`.

## Operating rules

1. **Source of truth is `.agenstra/`** — edit rules, skills, commands, agents, and MCP definitions there; transform to emit tool-specific configs.
2. **MCP first** — call `ai_validate` / `ai_read_context` / `ai_transform` / `ai_list_tools` instead of inventing Cursor/OpenCode layouts.
3. **Dry-run by default** — `ai_transform` defaults to `dryRun: true`. Only set `dryRun: false` when you intend to write files.
4. **Validate before write** — run `ai_validate` (or transform with strict validation) before applying changes.
5. **Summaries, not dumps** — use `ai_read_context` for metadata and counts; do not paste full rule/skill bodies into the conversation when a summary suffices.

## MCP tools (preferred)

| Tool              | Use                                                                  |
| ----------------- | -------------------------------------------------------------------- |
| `ai_list_tools`   | Supported transform targets (`cursor`, `opencode`, `github-copilot`) |
| `ai_validate`     | Read + validate workspace `.agenstra`                                |
| `ai_read_context` | Compact summary (ids, counts — no file bodies)                       |
| `ai_transform`    | Emit tool configs; `dryRun` defaults to **true**                     |

Launch:

```bash
nx run ai:mcp
# or
node tools/ai/mcp-run.cjs
```

CLI / library equivalents:

```bash
# after nx run ai:scripts-binary (agentctx) or via programmatic transform
agentctx --dry-run
agentctx --target cursor --outputDir .
```

```ts
import { transform, readContext, validateContext, listTools } from '@forepath/ai';
```

## When to use

- Adding or changing `.agenstra` MCP definitions, skills, rules, or commands
- Regenerating `.cursor/mcp.json` / OpenCode MCP config / `.vscode/mcp.json` (Copilot) after definition changes
- Checking whether agent context still validates

## Related

- Package README: `tools/ai/README.md`
- Skill source: `tools/ai/src/lib/mcp/SKILL.md` (MCP prompt/resource; Cursor/OpenCode/Copilot dual-publish thin skill stubs)
- MCP definition format (optional extras): `docs/agenstra/ai-agents/mcp-definitions.md`
- Workspace MCP wiring: `.agenstra/mcp-definitions/` (emitted to `.cursor/mcp.json` / `opencode.json` / `.vscode/mcp.json`)
- Scaffolding apps/libs: **code** MCP skill / `code_*` tools (not this skill)
