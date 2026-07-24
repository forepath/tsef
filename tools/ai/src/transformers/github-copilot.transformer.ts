import { isMcpOwnedSkill } from '../lib/mcp/agenstra-skill';
import { collectMcpOwnedSkillStubs } from '../lib/mcp/mcp-skill-stub';
import type { AgenstraAgent, AgenstraContext, AgenstraSubagent, ToolOutput } from '../types';

import { BaseTransformer } from './base.transformer';
import { skillToFolderSkillMd } from './skill-folder';

const GITHUB_DIR = '.github';
const VSCODE_DIR = '.vscode';

/**
 * Path-specific instructions: NAME.instructions.md with frontmatter applyTo (glob).
 * applyTo uses glob syntax; "**" = all files. Optional excludeAgent: "code-review" | "coding-agent".
 * @see https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
 */
function withApplyToFrontmatter(content: string, applyTo = '**'): string {
  const escaped = applyTo.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `---
applyTo: "${escaped}"
---

${content}`;
}

function yamlEscape(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/**
 * Map .agenstra MCP definition to VS Code / Copilot `.vscode/mcp.json` server entry.
 * Copilot Chat in VS Code reads `servers` (not Cursor's `mcpServers`).
 * @see https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp
 */
function toVscodeMcpServerEntry(def: Record<string, unknown>): Record<string, unknown> | null {
  if (def.enabled === false) {
    return null;
  }

  const entry: Record<string, unknown> = {};
  const command = def.command;
  const env = def.env ?? def.environment;
  const url = def.url;

  if (Array.isArray(command) && command.length > 0) {
    entry.command = command[0];

    if (command.length > 1) entry.args = command.slice(1);
  } else if (typeof command === 'string') {
    entry.command = command;

    if (def.args != null) entry.args = def.args;
  }

  if (env != null && typeof env === 'object' && !Array.isArray(env) && Object.keys(env).length > 0) {
    entry.env = env;
  }

  if (typeof url === 'string') {
    entry.url = url;

    if (def.headers != null && typeof def.headers === 'object') entry.headers = def.headers;
  }

  if (Object.keys(entry).length === 0) {
    return null;
  }

  return entry;
}

function buildVscodeMcpJson(context: AgenstraContext): string {
  const servers: Record<string, Record<string, unknown>> = {};

  for (const [id, def] of Object.entries(context.mcpDefinitions)) {
    const entry = toVscodeMcpServerEntry(def as Record<string, unknown>);

    if (entry != null) {
      servers[id] = entry;
    }
  }

  return JSON.stringify({ servers }, null, 2);
}

/**
 * Build Copilot CLI custom agent `.agent.md` (YAML frontmatter + prompt body).
 * @see https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
 * @see https://docs.github.com/en/copilot/reference/custom-agents-configuration
 */
function agentToCopilotAgentMd(id: string, config: AgenstraAgent | AgenstraSubagent): string {
  const name = (config.name as string)?.trim() || id;
  const description = (config.description as string)?.trim() || name;
  const bodyContent = (config.body as string)?.trim() || description;
  const lines = ['---', `name: ${yamlEscape(name)}`, `description: ${yamlEscape(description)}`];

  if (config.model) {
    lines.push(`model: ${yamlEscape(String(config.model))}`);
  }

  const toolsList = toolsToCopilotList(config.tools);

  if (toolsList !== undefined) {
    lines.push(`tools: [${toolsList.map((t) => yamlEscape(t)).join(', ')}]`);
  }

  lines.push('---', '', bodyContent || 'Execute tasks according to the agent configuration.', '');

  return lines.join('\n');
}

/**
 * Copilot expects `tools` as a list of tool name strings (or omit for all tools).
 * Agenstra stores OpenCode-style `{ write: true, edit: false, … }`.
 */
function toolsToCopilotList(tools: unknown): string[] | undefined {
  if (tools == null) {
    return undefined;
  }

  if (Array.isArray(tools)) {
    return tools.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  }

  if (typeof tools === 'object') {
    return Object.entries(tools as Record<string, unknown>)
      .filter(([, enabled]) => enabled === true)
      .map(([name]) => name);
  }

  return undefined;
}

export class GithubCopilotTransformer extends BaseTransformer {
  readonly name = 'github-copilot' as const;

  /**
   * @param workspaceRoot Workspace root for resolving package MCP skills.
   *   Pass `false` to skip dual-publish stubs (unit tests). Omit to resolve from cwd.
   */
  constructor(private readonly workspaceRoot?: string | false) {
    super();
  }

  canUseComponent(): boolean {
    return true;
  }

  transform(context: AgenstraContext): ToolOutput {
    const out = new Map<string, string>();
    const mainInstructions = buildCopilotInstructions(context);

    out.set(`${GITHUB_DIR}/copilot-instructions.md`, mainInstructions);

    // Group rules by globs: rules with globs (except ['**']) get path-specific instruction files
    const rulesByGlobsKey = new Map<
      string,
      { applyTo: string; rules: Array<{ name: string; entry: import('../types').RuleEntry }> }
    >();
    const isRepoWide = (g: string[] | undefined) => g != null && g.length === 1 && g[0] === '**';

    for (const [name, entry] of Object.entries(context.rules)) {
      if (name.startsWith('_')) continue;

      const ruleEntry = typeof entry === 'string' ? { content: entry } : entry;
      const globs = ruleEntry.globs;

      if (globs != null && globs.length > 0 && !isRepoWide(globs)) {
        const key = [...globs].sort().join(',');
        const applyTo = globs.join(', ');
        const bucket = rulesByGlobsKey.get(key);

        if (bucket == null) {
          rulesByGlobsKey.set(key, { applyTo, rules: [{ name, entry: ruleEntry }] });
        } else {
          bucket.rules.push({ name, entry: ruleEntry });
        }
      }
    }

    for (const { applyTo, rules } of rulesByGlobsKey.values()) {
      const parts: string[] = [`# Path-specific instructions\n\n`, `Apply to: \`${applyTo}\`\n\n`];

      for (const { name, entry } of rules) {
        parts.push(`## ${name}\n\n`, entry.content, '\n\n');
      }

      const namePart = rules.map((r) => r.name).join('-');
      const safeName =
        namePart
          .replace(/[^a-zA-Z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase() || 'path-specific';

      out.set(
        `${GITHUB_DIR}/instructions/${safeName}.instructions.md`,
        withApplyToFrontmatter(parts.join(''), applyTo),
      );
    }

    // Skills: `.github/skills/<stem>/SKILL.md` (Copilot CLI project skills)
    // @see https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
    for (const [name, entry] of Object.entries(context.skills)) {
      if (isMcpOwnedSkill(name)) continue;

      out.set(`${GITHUB_DIR}/skills/${name}/SKILL.md`, skillToFolderSkillMd(name, entry));
    }

    if (this.workspaceRoot !== false) {
      const stubRoot = this.workspaceRoot === undefined ? undefined : this.workspaceRoot;

      for (const [relPath, content] of collectMcpOwnedSkillStubs('github-copilot', stubRoot)) {
        out.set(relPath, content);
      }
    }

    // Custom agents: `.github/agents/<id>.agent.md` (primary + subagents)
    // @see https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
    const allAgents = { ...context.agents, ...context.subagents };

    for (const [id, config] of Object.entries(allAgents)) {
      out.set(`${GITHUB_DIR}/agents/${id}.agent.md`, agentToCopilotAgentMd(id, config));
    }

    // Copilot Chat (VS Code) reads repository MCP servers from .vscode/mcp.json
    out.set(`${VSCODE_DIR}/mcp.json`, buildVscodeMcpJson(context));

    return out;
  }
}

function buildCopilotInstructions(context: AgenstraContext): string {
  const parts: string[] = ['# Repository instructions\n', 'Generated from .agenstra context.\n\n'];

  for (const [name, entry] of Object.entries(context.rules)) {
    if (name.startsWith('_')) continue;

    const ruleEntry = typeof entry === 'string' ? { content: entry } : entry;
    const globs = ruleEntry.globs;
    const repoWide = globs == null || globs.length === 0 || (globs.length === 1 && globs[0] === '**');

    if (repoWide) {
      parts.push(`## ${name}\n\n`, ruleEntry.content, '\n\n');
    }
  }

  return parts.join('');
}
