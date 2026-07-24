import * as path from 'path';

import type { AgenstraContext } from '../types';

import { GithubCopilotTransformer } from './github-copilot.transformer';

describe('GithubCopilotTransformer', () => {
  const transformer = new GithubCopilotTransformer(false);

  function baseContext(overrides: Partial<AgenstraContext> = {}): AgenstraContext {
    return {
      metadata: { appName: 'test' },
      rules: { 'coding-standards': { content: '# Coding Standards\n', alwaysApply: true, globs: ['**'] } },
      commands: {},
      skills: {},
      agents: {
        architect: {
          id: 'architect',
          name: 'Architect',
          description: 'Architecture help',
          mode: 'primary',
          body: 'Design systems carefully.',
        } as import('../types').AgenstraAgent,
      },
      subagents: {},
      mcpDefinitions: {},
      ...overrides,
    };
  }

  it('emits repository instructions, native agents/skills, and .vscode/mcp.json', () => {
    const context = baseContext({
      skills: { 'design-patterns': { content: '# Design Patterns\n' } },
      subagents: {
        explorer: {
          id: 'explorer',
          name: 'Explorer',
          description: 'Explores the codebase',
          mode: 'subagent',
          tools: { read: true, edit: false, bash: true },
        } as import('../types').AgenstraSubagent,
      },
      mcpDefinitions: {
        ai: {
          id: 'ai',
          type: 'local',
          command: ['node', '${workspaceFolder}/tools/ai/mcp-run.cjs'],
          environment: {},
          enabled: true,
        },
        remote: {
          id: 'remote',
          type: 'remote',
          url: 'https://example.com/mcp',
          headers: { Authorization: 'Bearer token' },
        },
        disabled: {
          id: 'disabled',
          type: 'local',
          command: ['echo', 'noop'],
          enabled: false,
        },
      },
    });
    const out = transformer.transform(context);

    expect(out.get('.github/copilot-instructions.md')).toContain('# Coding Standards');
    expect(out.get('.github/instructions/agents.instructions.md')).toBeUndefined();
    expect(out.get('.github/instructions/skills.instructions.md')).toBeUndefined();

    const agentMd = out.get('.github/agents/architect.agent.md') as string;

    expect(agentMd).toContain('name: "Architect"');
    expect(agentMd).toContain('description: "Architecture help"');
    expect(agentMd).toContain('Design systems carefully.');

    const subagentMd = out.get('.github/agents/explorer.agent.md') as string;

    expect(subagentMd).toContain('name: "Explorer"');
    expect(subagentMd).toContain('tools: ["read", "bash"]');

    const skillContent = out.get('.github/skills/design-patterns/SKILL.md') as string;

    expect(skillContent).toContain('name: design-patterns');
    expect(skillContent).toContain('# Design Patterns');

    const mcpJson = JSON.parse(out.get('.vscode/mcp.json') as string) as {
      servers: Record<string, { command?: string; args?: string[]; url?: string; headers?: object }>;
    };

    expect(mcpJson.servers.ai).toEqual({
      command: 'node',
      args: ['${workspaceFolder}/tools/ai/mcp-run.cjs'],
    });
    expect(mcpJson.servers.remote).toEqual({
      url: 'https://example.com/mcp',
      headers: { Authorization: 'Bearer token' },
    });
    expect(mcpJson.servers.disabled).toBeUndefined();
  });

  it('emits empty servers object when there are no mcp definitions', () => {
    const out = transformer.transform(baseContext());
    const mcpJson = JSON.parse(out.get('.vscode/mcp.json') as string) as { servers: Record<string, unknown> };

    expect(mcpJson.servers).toEqual({});
  });

  it('ignores .agenstra copies of MCP-owned skills and dual-publishes thin stubs from packages', () => {
    const context = baseContext({
      skills: {
        'design-patterns': { content: '# Design Patterns\n' },
        ai: { content: '# DO NOT EMIT THIS FULL BODY FROM AGENSTRA\n' },
        code: { content: '# DO NOT EMIT CODE BODY\n' },
        graph: { content: '# DO NOT EMIT GRAPH BODY\n' },
      },
    });
    const workspaceRoot = path.resolve(__dirname, '../../../../');
    const out = new GithubCopilotTransformer(workspaceRoot).transform(context);

    expect(out.get('.github/skills/design-patterns/SKILL.md')).toBeDefined();

    const aiStub = out.get('.github/skills/ai/SKILL.md') as string;

    expect(aiStub).toContain('name: ai');
    expect(aiStub).toContain('skill://ai');
    expect(aiStub).toContain('GitHub Copilot skills');
    expect(aiStub).not.toContain('DO NOT EMIT THIS FULL BODY FROM AGENSTRA');

    const graphStub = out.get('.github/skills/graph/SKILL.md') as string;

    expect(graphStub).toContain('knowledge-graph');
    expect(graphStub).toContain('skill://graph');
    expect(graphStub).not.toContain('DO NOT EMIT GRAPH BODY');
  });

  it('groups path-specific rules including the first rule in each globs bucket', () => {
    const out = transformer.transform(
      baseContext({
        rules: {
          csharp: {
            content: '# C# Standards\n',
            globs: ['**/*.cs'],
          },
        },
      }),
    );
    const pathSpecific = out.get('.github/instructions/csharp.instructions.md') as string;

    expect(pathSpecific).toContain('# C# Standards');
    expect(pathSpecific).toContain('applyTo: "**/*.cs"');
  });
});
