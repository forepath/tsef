# Skills

Domain-specific knowledge (patterns, best practices) as **MDC** (`.skill.mdc`) in `.agenstra/skills/`.

## Purpose

Skills document reusable expertise (e.g. TypeScript patterns, testing strategies) that agents can load when relevant. Tools that support separate skill files get one file per skill; tools that do not receive skills merged into rules or instructions during transformation.

## Structure

- **Location**: `.agenstra/skills/`
- **Format**: MDC (`.skill.mdc`) to YAML frontmatter + body
- **Naming**: Descriptive name (e.g. `design-patterns.skill.mdc`, `testing-patterns.skill.mdc`)

The **filename stem** (without `.skill.mdc`) is the skill key. The **body** is the skill content emitted by the transformers.

## Frontmatter (metadata)

Optional metadata between `---` is read by the reader and available in the context; transformers do not use it (they derive descriptions from content as needed).

| Field         | Type   | Description                                |
| ------------- | ------ | ------------------------------------------ |
| `id`          | string | Optional identifier (key is filename stem) |
| `name`        | string | Optional display name                      |
| `description` | string | Optional short description                 |

## Content guidelines

- **Self-contained**: Each file should be understandable without requiring other skills.
- **Structured**: Use headings, lists, and code blocks so agents can parse and apply the content.
- **Referential**: You may reference rules or other docs; avoid duplicating long passages.

## Example

```mdc
---
id: design-patterns
name: Design Patterns
description: Reusable patterns and trade-offs
---
# Design Patterns

## Factory Pattern

**When to use:** Creating objects of similar types with varying logic.

### Trade-offs

- Reduces coupling; adds an abstraction layer.
```

## Output by tool

- **Cursor**: One folder per skill under `.cursor/skills/<name>/` with a `SKILL.md` file (frontmatter: `name`, `description`), **except** MCP package skills (`ai`, `code`, `graph`). Those live in `tools/<pkg>/src/lib/mcp/SKILL.md` and are exposed by the matching MCP server as an MCP **prompt** (and `skill://<name>` **resource**); Cursor also dual-publishes thin stubs under `.cursor/skills/`.
- **OpenCode**: Same folder layout under `.opencode/skills/<name>/SKILL.md`, including thin MCP stubs.
- **GitHub Copilot**: Same folder layout under [`.github/skills/<name>/SKILL.md`](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills), including thin MCP stubs. MCP package skill stems in `.agenstra/skills/` are not copied as full bodies.

## MCP package skills

| Skill stem | Package path                       | MCP server id     | Prompt / resource               |
| ---------- | ---------------------------------- | ----------------- | ------------------------------- |
| `ai`       | `tools/ai/src/lib/mcp/SKILL.md`    | `ai`              | prompt `ai`, `skill://ai`       |
| `code`     | `tools/code/src/lib/mcp/SKILL.md`  | `code`            | prompt `code`, `skill://code`   |
| `graph`    | `tools/graph/src/lib/mcp/SKILL.md` | `knowledge-graph` | prompt `graph`, `skill://graph` |

## Related

- [Knowledge graph](./knowledge-graph.md): `graph/graph.json` and the **Knowledge Graph Skill** for structural navigation
- [Agents](./agents.md): Agents reference skills
- [Rules](./rules.md): Rules vs. skills: rules are project instructions; skills are reusable knowledge
- [README](./README.md): Overview of `.agenstra/` and transformation
