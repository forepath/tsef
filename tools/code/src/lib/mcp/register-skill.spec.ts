import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadMcpSkill, registerMcpSkill } from './register-skill';

describe('code MCP skill registration', () => {
  const skillDir = __dirname;

  it('loads SKILL.md with folded description', () => {
    const skill = loadMcpSkill('code', skillDir);

    expect(skill.stem).toBe('code');
    expect(skill.name).toBe('Code Skill');
    expect(skill.description.length).toBeGreaterThan(20);
    expect(skill.raw.startsWith('---')).toBe(true);
    expect(skill.body).toContain('Code Skill');
  });

  it('defaults skillDir to the mcp package directory', () => {
    const skill = loadMcpSkill('code');
    expect(skill.name).toBe('Code Skill');
  });

  it('throws when SKILL.md is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-skill-'));

    try {
      expect(() => loadMcpSkill('code', tmp)).toThrow(/Skill file not found/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('parses skills without frontmatter and with quoted fields', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-skill-plain-'));

    try {
      fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'Plain body only\n', 'utf8');
      const plain = loadMcpSkill('code', tmp);

      expect(plain.name).toBe('code');
      expect(plain.description).toBe('code skill');
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
      const quoted = loadMcpSkill('code', tmp);

      expect(quoted.name).toBe('Quoted Name');
      expect(quoted.description).toBe('Quoted desc');
      expect(quoted.body).toBe('Body');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('treats unclosed frontmatter as plain content and skips non-kv lines', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-skill-edge-'));

    try {
      fs.writeFileSync(path.join(tmp, 'SKILL.md'), '---\nname: dangling\nno closing fence\n', 'utf8');
      const unclosed = loadMcpSkill('code', tmp);
      expect(unclosed.name).toBe('code');
      expect(unclosed.description).toBe('code skill');
      expect(unclosed.body).toContain('dangling');

      fs.writeFileSync(
        path.join(tmp, 'SKILL.md'),
        `---
name: Folded
description: >
  First line
  Second line
# ignore me
description: ignored-inline
---

Folded body
`,
        'utf8',
      );
      const folded = loadMcpSkill('code', tmp);
      expect(folded.name).toBe('Folded');
      expect(folded.description).toBe('First line Second line');
      expect(folded.body).toBe('Folded body');

      fs.writeFileSync(
        path.join(tmp, 'SKILL.md'),
        `---
name: EmptyBody
description: only-meta
---
`,
        'utf8',
      );
      const emptyBody = loadMcpSkill('code', tmp);
      expect(emptyBody.body).toContain('only-meta');
      expect(emptyBody.description).toBe('only-meta');

      fs.writeFileSync(
        path.join(tmp, 'SKILL.md'),
        `---
name: MarkerOnly
description: >
---

Body after marker
`,
        'utf8',
      );
      const markerOnly = loadMcpSkill('code', tmp);
      expect(markerOnly.name).toBe('MarkerOnly');
      expect(markerOnly.description).toBe('MarkerOnly skill');
      expect(markerOnly.body).toBe('Body after marker');
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

    registerMcpSkill(server as never, 'code', skillDir);

    expect(prompts).toEqual([{ name: 'code', description: expect.any(String), handler: expect.any(Function) }]);
    expect(resources).toEqual([{ name: 'code', uri: 'skill://code', handler: expect.any(Function) }]);

    const promptResult = (await prompts[0].handler()) as {
      messages: Array<{ content: { text: string } }>;
    };
    expect(promptResult.messages[0].content.text).toContain('Code Skill');

    const resourceResult = (await resources[0].handler()) as {
      contents: Array<{ uri: string; text: string }>;
    };
    expect(resourceResult.contents[0].uri).toBe('skill://code');
    expect(resourceResult.contents[0].text.startsWith('---')).toBe(true);
  });
});
