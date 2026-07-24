import type { AgenstraContext } from '../../types';

import { summarizeContext } from './summarize-context';

describe('ai mcp summarizeContext', () => {
  it('summarizes without including rule/skill bodies', () => {
    const context: AgenstraContext = {
      metadata: { appName: 'demo' },
      rules: {
        coding: {
          content: 'SECRET_RULE_BODY',
          name: 'Coding',
          description: 'Standards',
          alwaysApply: true,
          globs: ['**'],
        },
      },
      commands: {
        impact: { id: 'impact', name: 'Impact', description: 'Blast radius', prompt: 'SECRET_PROMPT' },
      },
      skills: {
        graph: { content: 'SECRET_SKILL', name: 'Graph', description: 'KG skill' },
      },
      agents: {
        architect: { id: 'architect', name: 'Architect', description: 'Design', mode: 'primary' },
      },
      subagents: {},
      mcpDefinitions: {
        'knowledge-graph': {
          id: 'knowledge-graph',
          name: 'Knowledge Graph',
          description: 'Graph MCP',
          type: 'local',
          enabled: true,
        },
      },
    };
    const summary = summarizeContext(context);
    const encoded = JSON.stringify(summary);

    expect(summary.counts.rules).toBe(1);
    expect(summary.counts.commands).toBe(1);
    expect(summary.counts.skills).toBe(1);
    expect(summary.counts.mcpDefinitions).toBe(1);
    expect(summary.rules[0]).toEqual(expect.objectContaining({ key: 'coding', name: 'Coding', alwaysApply: true }));
    expect(encoded).not.toContain('SECRET_RULE_BODY');
    expect(encoded).not.toContain('SECRET_PROMPT');
    expect(encoded).not.toContain('SECRET_SKILL');
  });
});
