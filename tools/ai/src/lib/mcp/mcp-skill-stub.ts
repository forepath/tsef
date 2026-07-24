import * as fs from 'fs';
import * as path from 'path';

import { loadMcpSkill, MCP_OWNED_SKILL_STEMS, type McpOwnedSkillStem } from './agenstra-skill';
import { resolveWorkspaceRoot } from './workspace';

export interface McpOwnedSkillPublishMeta {
  /** Workspace-relative path to the canonical SKILL.md. */
  skillPath: string;
  /** MCP server id used by transform clients (Cursor / OpenCode / Copilot). */
  mcpServerId: string;
  /** MCP prompt name and `skill://` resource stem. */
  promptName: string;
}

export type McpSkillStubClient = 'cursor' | 'opencode' | 'github-copilot';

/**
 * Where each MCP-owned skill lives and how clients should address the MCP surface.
 */
export const MCP_OWNED_SKILL_PUBLISH: Record<McpOwnedSkillStem, McpOwnedSkillPublishMeta> = {
  ai: {
    skillPath: 'tools/ai/src/lib/mcp/SKILL.md',
    mcpServerId: 'ai',
    promptName: 'ai',
  },
  code: {
    skillPath: 'tools/code/src/lib/mcp/SKILL.md',
    mcpServerId: 'code',
    promptName: 'code',
  },
  graph: {
    skillPath: 'tools/graph/src/lib/mcp/SKILL.md',
    mcpServerId: 'knowledge-graph',
    promptName: 'graph',
  },
};

const CLIENT_SKILLS_ROOT: Record<McpSkillStubClient, string> = {
  cursor: '.cursor/skills',
  opencode: '.opencode/skills',
  'github-copilot': '.github/skills',
};
const CLIENT_DISCOVERY_LABEL: Record<McpSkillStubClient, string> = {
  cursor: 'Cursor Agent Skills',
  opencode: 'OpenCode skills',
  'github-copilot': 'GitHub Copilot skills',
};

function yamlEscape(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/**
 * Thin skill stub for Cursor/OpenCode/Copilot discovery + pointer to MCP prompt/resource.
 * Canonical body stays in the package `SKILL.md` (single source of truth).
 * Frontmatter `name` matches the skill directory stem (required by OpenCode / Copilot).
 */
export function buildMcpSkillStub(
  stem: McpOwnedSkillStem,
  skillDir: string,
  client: McpSkillStubClient = 'cursor',
): string {
  const skill = loadMcpSkill(stem, skillDir);
  const meta = MCP_OWNED_SKILL_PUBLISH[stem];

  return `---
name: ${stem}
description: ${yamlEscape(skill.description)}
---

# ${skill.name}

Canonical skill text is served by the **${meta.mcpServerId}** MCP — do not maintain a second full copy here.

## When this applies

${skill.description}

## What to do

1. Prefer the **${meta.mcpServerId}** MCP tools over hand-rolling.
2. Load the full skill via MCP prompt \`${meta.promptName}\` or resource \`skill://${meta.promptName}\`.
3. Follow that document (source: \`${meta.skillPath}\`); do not invent parallel recipes in this stub.

This file exists only so ${CLIENT_DISCOVERY_LABEL[client]} can discover the skill when MCP is available.
`;
}

/** @deprecated Use buildMcpSkillStub */
export function buildMcpSkillCursorStub(stem: McpOwnedSkillStem, skillDir: string): string {
  return buildMcpSkillStub(stem, skillDir, 'cursor');
}

/**
 * Emit `<skillsRoot>/<stem>/SKILL.md` stubs for every MCP-owned package skill that exists
 * under the workspace root. Missing packages are skipped (non-monorepo transforms).
 */
export function collectMcpOwnedSkillStubs(
  client: McpSkillStubClient,
  workspaceRoot: string = resolveWorkspaceRoot(),
): Map<string, string> {
  const skillsRoot = CLIENT_SKILLS_ROOT[client];
  const out = new Map<string, string>();

  for (const stem of MCP_OWNED_SKILL_STEMS) {
    const meta = MCP_OWNED_SKILL_PUBLISH[stem];
    const skillFile = path.join(workspaceRoot, meta.skillPath);

    if (!fs.existsSync(skillFile)) {
      continue;
    }

    const content = buildMcpSkillStub(stem, path.dirname(skillFile), client);

    out.set(`${skillsRoot}/${stem}/SKILL.md`, content);
  }

  return out;
}

/** @deprecated Use collectMcpOwnedSkillStubs('cursor', …) */
export function collectMcpOwnedCursorSkillStubs(workspaceRoot: string = resolveWorkspaceRoot()): Map<string, string> {
  return collectMcpOwnedSkillStubs('cursor', workspaceRoot);
}
