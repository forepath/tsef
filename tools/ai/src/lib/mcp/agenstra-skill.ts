import * as fs from 'fs';
import * as path from 'path';

export interface McpSkillFile {
  stem: string;
  name: string;
  description: string;
  /** Full file text including frontmatter. */
  raw: string;
  /** Body after YAML frontmatter. */
  body: string;
}

/**
 * Skill stems owned by MCP packages (`tools/<pkg>/src/lib/mcp/SKILL.md`).
 * Cursor and OpenCode dual-publish thin discovery stubs; full bodies are not copied from `.agenstra/skills/`.
 */
export const MCP_OWNED_SKILL_STEMS = ['ai', 'code', 'graph'] as const;

export type McpOwnedSkillStem = (typeof MCP_OWNED_SKILL_STEMS)[number];

export function isMcpOwnedSkill(stem: string): boolean {
  return (MCP_OWNED_SKILL_STEMS as readonly string[]).includes(stem);
}

/**
 * Load this package's MCP skill from `lib/mcp/SKILL.md` (copied next to the compiled JS).
 */
export function loadMcpSkill(stem: string, skillDir: string = __dirname): McpSkillFile {
  const filePath = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Skill file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMdc(raw);
  const name = typeof parsed.data.name === 'string' && parsed.data.name.trim() ? parsed.data.name.trim() : stem;
  const description =
    typeof parsed.data.description === 'string' && parsed.data.description.trim()
      ? parsed.data.description.trim()
      : `${name} skill`;

  return {
    stem,
    name,
    description,
    raw,
    body: parsed.content.trim() || raw,
  };
}

function parseMdc(raw: string): { data: Record<string, unknown>; content: string } {
  if (!raw.startsWith('---')) {
    return { data: {}, content: raw };
  }

  const end = raw.indexOf('\n---', 3);

  if (end === -1) {
    return { data: {}, content: raw };
  }

  const content = raw.slice(end + 4).replace(/^\r?\n/, '');
  const data: Record<string, unknown> = {};
  const descFold = /^description:\s*>\s*\n((?:[ \t]+.+\n?)+)/m.exec(raw.slice(0, end + 4));

  if (descFold) {
    data.description = descFold[1]
      .split(/\r?\n/)
      .map((l) => l.replace(/^[ \t]+/, '').trim())
      .filter(Boolean)
      .join(' ');
  }

  const fm = raw.slice(3, end).trim();

  for (const line of fm.split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);

    if (!m) continue;

    const key = m[1];

    if (key === 'description' && data.description) continue;

    let value = m[2].trim();

    if (value === '>') continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    data[key] = value;
  }

  return { data, content };
}
