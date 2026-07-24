import { isMcpOwnedSkill } from '../lib/mcp/agenstra-skill';
import type { AgenstraContext } from '../types';

import type { BaseTransformer } from './base.transformer';

const MERGED_SKILLS_KEY = '_merged_skills';

/**
 * Merge components that the tool cannot use natively into fallback entries (e.g. skills -> rules).
 * Mutates context by adding merged content; use a copy if you need to keep original.
 * Skills owned by MCP packages (ai, code, graph) are omitted from merged skills —
 * clients that support native skills dual-publish thin stubs; full bodies stay on MCP
 * prompts/resources (`tools/<pkg>/src/lib/mcp/SKILL.md`).
 */
export function mergeComponentsForTransformer(context: AgenstraContext, transformer: BaseTransformer): AgenstraContext {
  const toMerge = transformer.needsFallbackMerge();

  if (toMerge.length === 0) return context;

  const next = { ...context, rules: { ...context.rules } };

  if (toMerge.includes('skills') && Object.keys(context.skills).length > 0) {
    const emitSkills = Object.fromEntries(Object.entries(context.skills).filter(([name]) => !isMcpOwnedSkill(name)));

    if (Object.keys(emitSkills).length > 0) {
      next.rules[MERGED_SKILLS_KEY] = mergeSkillsIntoMarkdown(emitSkills);
    }
  }

  return next;
}

function mergeSkillsIntoMarkdown(skills: Record<string, import('../types').SkillEntry>): string {
  const parts: string[] = ['# Merged Skills\n', 'The following sections are merged from .agenstra/skills/.\n'];

  for (const [name, entry] of Object.entries(skills)) {
    parts.push(`\n## ${name}\n\n`, entry.content);
  }

  return parts.join('');
}
