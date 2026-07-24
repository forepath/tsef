import * as path from 'path';

import type { AgenstraContext } from '../types';

import { OpenCodeTransformer } from './opencode.transformer';

describe('OpenCodeTransformer', () => {
  const transformer = new OpenCodeTransformer(false);

  it('emits AGENTS.md, commands, agents, and opencode.json', () => {
    const context: AgenstraContext = {
      metadata: { appName: 'test' },
      rules: { 'coding-standards': { content: '# Coding Standards\n' } },
      commands: { refactor: { id: 'refactor', name: 'Refactor', prompt: 'Refactor this' } },
      skills: { 'design-patterns': { content: '# Design Patterns\n', description: 'Patterns skill' } },
      agents: {
        architect: {
          id: 'architect',
          name: 'Architect',
          mode: 'primary',
        } as import('../types').AgenstraAgent,
      },
      subagents: {},
      mcpDefinitions: {},
    };
    const out = transformer.transform(context);

    expect(out.get('AGENTS.md')).toContain('Coding Standards');
    expect(out.get('.opencode/commands/refactor.md')).toContain('Refactor this');
    expect(out.get('.opencode/agents/architect.md')).toBeDefined();
    expect(out.get('opencode.json')).toContain('$schema');
    expect(out.get('.opencode/skills/design-patterns/SKILL.md')).toContain('name: design-patterns');
    expect(out.get('.opencode/skills/design-patterns/SKILL.md')).toContain('Patterns skill');
    expect(out.get('.opencode/skills/ai/SKILL.md')).toBeUndefined();
  });

  it('copies .agenstra skills and dual-publishes MCP stubs like Cursor', () => {
    const context: AgenstraContext = {
      metadata: { appName: 'test' },
      rules: {},
      commands: {},
      skills: {
        'design-patterns': { content: '# Design Patterns\n' },
        ai: { content: '# DO NOT EMIT THIS FULL BODY FROM AGENSTRA\n' },
      },
      agents: {},
      subagents: {},
      mcpDefinitions: {},
    };
    const workspaceRoot = path.resolve(__dirname, '../../../../');
    const out = new OpenCodeTransformer(workspaceRoot).transform(context);

    expect(out.get('.opencode/skills/design-patterns/SKILL.md')).toContain('# Design Patterns');
    const aiStub = out.get('.opencode/skills/ai/SKILL.md') as string;

    expect(aiStub).toContain('name: ai');
    expect(aiStub).toContain('skill://ai');
    expect(aiStub).not.toContain('DO NOT EMIT THIS FULL BODY FROM AGENSTRA');
    expect(out.get('.opencode/skills/code/SKILL.md')).toContain('skill://code');
    expect(out.get('.opencode/skills/graph/SKILL.md')).toContain('knowledge-graph');
  });
});
