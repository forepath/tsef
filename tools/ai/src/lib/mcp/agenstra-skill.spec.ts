import * as path from 'path';

import { isMcpOwnedSkill, loadMcpSkill, MCP_OWNED_SKILL_STEMS } from './agenstra-skill';

describe('MCP package skills', () => {
  it('marks ai/code/graph as MCP-owned', () => {
    expect(MCP_OWNED_SKILL_STEMS).toEqual(['ai', 'code', 'graph']);
    expect(isMcpOwnedSkill('ai')).toBe(true);
    expect(isMcpOwnedSkill('design-patterns')).toBe(false);
  });

  it('loads this package SKILL.md from lib/mcp', () => {
    const skill = loadMcpSkill('ai', path.join(__dirname));

    expect(skill.stem).toBe('ai');
    expect(skill.raw.startsWith('---')).toBe(true);
    expect(skill.body).toContain('AI Skill');
    expect(skill.description.length).toBeGreaterThan(10);
  });
});
