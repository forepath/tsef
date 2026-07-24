import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { loadMcpSkill } from './agenstra-skill';

/**
 * Register this package's `lib/mcp/SKILL.md` as an MCP prompt + resource.
 */
export function registerMcpSkill(server: McpServer, skillStem: string, skillDir?: string): void {
  const skill = loadMcpSkill(skillStem, skillDir);
  const resourceUri = `skill://${skillStem}`;

  server.prompt(skillStem, skill.description, async () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: skill.body,
        },
      },
    ],
  }));

  server.resource(skillStem, resourceUri, async () => ({
    contents: [
      {
        uri: resourceUri,
        mimeType: 'text/markdown',
        text: skill.raw,
      },
    ],
  }));
}

/** @deprecated Use registerMcpSkill */
export const registerAgenstraSkillOnMcp = registerMcpSkill;
