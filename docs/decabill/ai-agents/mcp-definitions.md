# MCP Definitions

Model Context Protocol (MCP) server definitions used to configure local or remote MCP servers for Cursor, OpenCode, and GitHub Copilot (VS Code).

## Purpose

MCP definitions in `.agenstra/mcp-definitions/` are the source of truth for MCP registration. The transformer maps them into each tool’s native format: Cursor uses a single `.cursor/mcp.json` with a `mcpServers` object; OpenCode uses an `mcp` object in `opencode.json`; GitHub Copilot (VS Code) uses `.vscode/mcp.json` with a `servers` object. Do **not** put package MCP servers in `overrides/` unless you intentionally need a one-off override.

Skills for package MCP servers (`ai`, `code`, `knowledge-graph`) live in each package: `tools/<pkg>/src/lib/mcp/SKILL.md`.

## Structure

- **Location**: `.agenstra/mcp-definitions/`
- **Format**: JSON (`.mcp.json`)
- **Naming**: Descriptive name (e.g. `ai.mcp.json`); the filename stem or `id` inside the JSON is the server id

## Schema (properties read by the reader)

Only the following JSON properties are read; all others are ignored. `id`, `name`, and `description` are kept by design (name/description are not emitted by transformers).

**Common fields**:

| Field         | Type    | Description                                             |
| ------------- | ------- | ------------------------------------------------------- |
| `id`          | string  | Server identifier (optional; defaults to filename stem) |
| `name`        | string  | Display name (read only; not emitted)                   |
| `description` | string  | Short description (read only; not emitted)              |
| `type`        | string  | `"local"` or `"remote"`                                 |
| `enabled`     | boolean | Optional; default true                                  |

**Local servers** (run a command on the machine):

| Field         | Type               | Description                                                                     |
| ------------- | ------------------ | ------------------------------------------------------------------------------- |
| `command`     | string \| string[] | Command to run. If array, first element is the command, rest are args           |
| `environment` | object             | Optional env vars (Cursor uses `env`; may be written as `environment` or `env`) |
| `env`         | object             | Alias for `environment`                                                         |

**Remote servers** (connect to a URL):

| Field     | Type   | Description                                  |
| --------- | ------ | -------------------------------------------- |
| `url`     | string | MCP server URL                               |
| `headers` | object | Optional HTTP headers (e.g. `Authorization`) |

The `args` field (for local commands when `command` is a string) is also read.

## Example (local)

```json
{
  "id": "ai",
  "type": "local",
  "command": ["node", "${workspaceFolder}/tools/ai/mcp-run.cjs"],
  "environment": {},
  "enabled": true
}
```

## Output by tool

- **Cursor** – Single `.cursor/mcp.json` with `mcpServers: { "<id>": { "command", "args", "env", "url", "headers", "enabled" } }` for local, or `{ "url", "headers", "enabled" }` for remote. Command array becomes `command` (first element) + `args` (rest); `environment`/`env` → `env`; `enabled` is forwarded when set in the definition.
- **OpenCode** – Top-level `mcp` in `opencode.json`: `mcp: { "<id>": { "type", "command" (array), "environment", "url", "headers", "enabled" } }` per [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers/).
- **GitHub Copilot** – `.vscode/mcp.json` with `servers: { "<id>": { "command", "args", "env", "url", "headers" } }` for [Copilot Chat MCP in VS Code](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp). Same command/args/env/url/headers mapping as Cursor; servers with `enabled: false` are omitted (VS Code has no `enabled` field in this file).

## Related

- [Agents](./agents.md) – Agents can reference MCP servers via `mcp` or `tools`
- [README](./README.md) – Overview of `.agenstra/` and transformation
- Package skills: `tools/ai|code|graph/src/lib/mcp/SKILL.md`
