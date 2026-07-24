/**
 * Shared helpers for emitting Agent Skills folders (`SKILL.md` with name + description).
 * Used by Cursor (`.cursor/skills/`), OpenCode (`.opencode/skills/`), and GitHub Copilot (`.github/skills/`).
 * @see https://cursor.com/docs/context/skills
 * @see https://opencode.ai/docs/skills/
 * @see https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
 */

function yamlEscape(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

export interface SkillFolderEntry {
  content: string;
  name?: string;
  description?: string;
}

/**
 * Build `<skillsRoot>/<stem>/SKILL.md`. Frontmatter `name` is the directory stem
 * (OpenCode requires name === folder name).
 */
export function skillToFolderSkillMd(stem: string, entry: SkillFolderEntry | string): string {
  const content = typeof entry === 'string' ? entry : entry.content;
  const descriptionFromEntry =
    typeof entry === 'object' && typeof entry.description === 'string' && entry.description.trim()
      ? entry.description.trim()
      : undefined;
  const firstLine = content.trim().split('\n')[0]?.replace(/^#\s*/, '') || stem;
  const description = descriptionFromEntry ?? (firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine);

  return `---
name: ${stem}
description: ${yamlEscape(description)}
---

${content}`;
}
