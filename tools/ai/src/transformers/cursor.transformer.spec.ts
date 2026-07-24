import * as path from 'path';

import type { AgenstraContext } from '../types';

import { CursorTransformer } from './cursor.transformer';

describe('CursorTransformer', () => {
  const transformer = new CursorTransformer(false);

  it('should output rules as .mdc with frontmatter, commands as .md, skills as folder/SKILL.md, agents as .md, mcp as .json', () => {
    const context: AgenstraContext = {
      metadata: { appName: 'test' },
      rules: { 'coding-standards': { content: '# Coding Standards\n' } },
      commands: { refactor: { id: 'refactor', name: 'Refactor', prompt: 'Refactor this' } },
      skills: { 'design-patterns': { content: '# Design Patterns\n' } },
      agents: {
        architect: {
          id: 'architect',
          name: 'Architect',
          mode: 'primary',
        } as import('../types').AgenstraAgent,
      },
      subagents: {
        general: {
          id: 'general',
          name: 'General',
          mode: 'subagent',
        } as import('../types').AgenstraSubagent,
      },
      mcpDefinitions: {
        'file-system': {
          id: 'file-system',
          type: 'local',
          command: ['npx', '-y', '@modelcontextprotocol/server-filesystem', '${workspaceFolder}'],
          environment: {},
          enabled: true,
        },
        disabled: {
          id: 'disabled',
          type: 'local',
          command: ['echo', 'noop'],
          enabled: false,
        },
      },
    };
    const out = transformer.transform(context);
    const ruleContent = out.get('.cursor/rules/coding-standards.mdc') as string;

    expect(ruleContent).toContain('name:');
    expect(ruleContent).toContain('description:');
    expect(ruleContent).toContain('globs: []');
    expect(ruleContent).toContain('alwaysApply: false');
    expect(ruleContent).toContain('# Coding Standards');

    expect(out.get('.cursor/commands/refactor.md')).toBeDefined();
    expect(out.get('.cursor/commands/refactor.md') as string).toContain('Refactor this');

    const skillContent = out.get('.cursor/skills/design-patterns/SKILL.md') as string;

    expect(skillContent).toContain('name:');
    expect(skillContent).toContain('# Design Patterns');

    expect(out.get('.cursor/agents/architect.md')).toBeDefined();
    expect(out.get('.cursor/agents/general.md')).toBeDefined();

    const mcpContent = out.get('.cursor/mcp.json') as string;

    expect(mcpContent).toBeDefined();
    const mcpJson = JSON.parse(mcpContent) as {
      mcpServers: Record<string, { enabled?: boolean; command?: string }>;
    };

    expect(mcpJson).toHaveProperty('mcpServers');
    expect(mcpJson.mcpServers['file-system'].enabled).toBe(true);
    expect(mcpJson.mcpServers['file-system'].command).toBe('npx');
    expect(mcpJson.mcpServers.disabled.enabled).toBe(false);
    expect(out.size).toBe(6);
  });

  it('ignores .agenstra copies of MCP-owned skills and dual-publishes thin stubs from packages', () => {
    const context: AgenstraContext = {
      metadata: { appName: 'test' },
      rules: {},
      commands: {},
      skills: {
        'design-patterns': { content: '# Design Patterns\n' },
        ai: { content: '# DO NOT EMIT THIS FULL BODY FROM AGENSTRA\n' },
        code: { content: '# DO NOT EMIT CODE BODY\n' },
        graph: { content: '# DO NOT EMIT GRAPH BODY\n' },
      },
      agents: {},
      subagents: {},
      mcpDefinitions: {},
    };
    const workspaceRoot = path.resolve(__dirname, '../../../../');
    const out = new CursorTransformer(workspaceRoot).transform(context);

    expect(out.get('.cursor/skills/design-patterns/SKILL.md')).toBeDefined();

    const aiStub = out.get('.cursor/skills/ai/SKILL.md') as string;

    expect(aiStub).toContain('name: ai');
    expect(aiStub).toContain('skill://ai');
    expect(aiStub).not.toContain('DO NOT EMIT THIS FULL BODY FROM AGENSTRA');

    const codeStub = out.get('.cursor/skills/code/SKILL.md') as string;

    expect(codeStub).toContain('skill://code');
    expect(codeStub).not.toContain('DO NOT EMIT CODE BODY');

    const graphStub = out.get('.cursor/skills/graph/SKILL.md') as string;

    expect(graphStub).toContain('knowledge-graph');
    expect(graphStub).toContain('skill://graph');
    expect(graphStub).not.toContain('DO NOT EMIT GRAPH BODY');
  });
});
