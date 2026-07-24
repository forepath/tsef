import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadMcpSkill, registerMcpSkill } from './register-skill';

describe('graph MCP skill registration', () => {
  const skillDir = __dirname;

  it('loads SKILL.md with folded description', () => {
    const skill = loadMcpSkill('graph', skillDir);

    expect(skill.stem).toBe('graph');
    expect(skill.name).toBe('Knowledge Graph Skill');
    expect(skill.description.length).toBeGreaterThan(20);
    expect(skill.raw.startsWith('---')).toBe(true);
    expect(skill.body).toContain('Knowledge Graph Skill');
  });

  it('throws when SKILL.md is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-skill-'));

    try {
      expect(() => loadMcpSkill('graph', tmp)).toThrow(/Skill file not found/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('parses skills without frontmatter and with quoted fields', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-skill-plain-'));

    try {
      fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'Plain body only\n', 'utf8');
      const plain = loadMcpSkill('graph', tmp);

      expect(plain.name).toBe('graph');
      expect(plain.description).toBe('graph skill');
      expect(plain.body).toContain('Plain body only');

      fs.writeFileSync(
        path.join(tmp, 'SKILL.md'),
        `---
name: "Quoted Name"
description: 'Quoted desc'
---

Body
`,
        'utf8',
      );
      const quoted = loadMcpSkill('graph', tmp);

      expect(quoted.name).toBe('Quoted Name');
      expect(quoted.description).toBe('Quoted desc');
      expect(quoted.body).toBe('Body');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('registers prompt and resource on an MCP server', async () => {
    const prompts: Array<{ name: string; description: string; handler: () => Promise<unknown> }> = [];
    const resources: Array<{ name: string; uri: string; handler: () => Promise<unknown> }> = [];
    const server = {
      prompt: (name: string, description: string, handler: () => Promise<unknown>) => {
        prompts.push({ name, description, handler });
      },
      resource: (name: string, uri: string, handler: () => Promise<unknown>) => {
        resources.push({ name, uri, handler });
      },
    };

    registerMcpSkill(server as never, 'graph', skillDir);

    expect(prompts).toEqual([{ name: 'graph', description: expect.any(String), handler: expect.any(Function) }]);
    expect(resources).toEqual([{ name: 'graph', uri: 'skill://graph', handler: expect.any(Function) }]);

    const promptResult = (await prompts[0].handler()) as {
      messages: Array<{ content: { text: string } }>;
    };
    expect(promptResult.messages[0].content.text).toContain('Knowledge Graph Skill');

    const resourceResult = (await resources[0].handler()) as {
      contents: Array<{ uri: string; text: string }>;
    };
    expect(resourceResult.contents[0].uri).toBe('skill://graph');
    expect(resourceResult.contents[0].text.startsWith('---')).toBe(true);
  });
});
