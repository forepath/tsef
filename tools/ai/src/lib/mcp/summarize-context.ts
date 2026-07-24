import type { AgenstraContext, RuleEntry, SkillEntry } from '../../types';

export interface AgenstraContextSummary {
  metadata: AgenstraContext['metadata'];
  counts: {
    rules: number;
    commands: number;
    skills: number;
    agents: number;
    subagents: number;
    mcpDefinitions: number;
  };
  rules: Array<{ key: string; name?: string; description?: string; alwaysApply?: boolean; globs?: string[] }>;
  commands: Array<{ key: string; id?: string; name?: string; description?: string }>;
  skills: Array<{ key: string; name?: string; description?: string }>;
  agents: Array<{ key: string; id?: string; name?: string; description?: string }>;
  subagents: Array<{ key: string; id?: string; name?: string; description?: string }>;
  mcpDefinitions: Array<{
    key: string;
    id?: string;
    name?: string;
    description?: string;
    type?: string;
    enabled?: boolean;
  }>;
}

/**
 * Compact .agenstra overview without dumping rule/skill/command bodies.
 */
export function summarizeContext(context: AgenstraContext): AgenstraContextSummary {
  const rules = Object.entries(context.rules).map(([key, entry]) => {
    if (typeof entry === 'string') {
      return { key };
    }

    const rule = entry as RuleEntry;

    return {
      key,
      name: rule.name,
      description: rule.description,
      alwaysApply: rule.alwaysApply,
      globs: rule.globs,
    };
  });
  const commands = Object.entries(context.commands).map(([key, cmd]) => ({
    key,
    id: typeof cmd.id === 'string' ? cmd.id : undefined,
    name: typeof cmd.name === 'string' ? cmd.name : undefined,
    description: typeof cmd.description === 'string' ? cmd.description : undefined,
  }));
  const skills = Object.entries(context.skills).map(([key, skill]: [string, SkillEntry]) => ({
    key,
    name: skill.name,
    description: skill.description,
  }));
  const agents = Object.entries(context.agents).map(([key, agent]) => ({
    key,
    id: agent.id,
    name: agent.name,
    description: agent.description,
  }));
  const subagents = Object.entries(context.subagents).map(([key, agent]) => ({
    key,
    id: agent.id,
    name: agent.name,
    description: agent.description,
  }));
  const mcpDefinitions = Object.entries(context.mcpDefinitions).map(([key, def]) => ({
    key,
    id: typeof def.id === 'string' ? def.id : undefined,
    name: typeof def.name === 'string' ? def.name : undefined,
    description: typeof def.description === 'string' ? def.description : undefined,
    type: typeof def.type === 'string' ? def.type : undefined,
    enabled: typeof def.enabled === 'boolean' ? def.enabled : undefined,
  }));

  return {
    metadata: context.metadata,
    counts: {
      rules: rules.length,
      commands: commands.length,
      skills: skills.length,
      agents: agents.length,
      subagents: subagents.length,
      mcpDefinitions: mcpDefinitions.length,
    },
    rules,
    commands,
    skills,
    agents,
    subagents,
    mcpDefinitions,
  };
}
