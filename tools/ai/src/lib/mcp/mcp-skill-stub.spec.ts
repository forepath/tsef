import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { buildMcpSkillStub, collectMcpOwnedSkillStubs, MCP_OWNED_SKILL_PUBLISH } from './mcp-skill-stub';

describe('MCP skill stubs (Cursor + OpenCode + Copilot)', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../');

  it('builds a thin stub that points at MCP prompt/resource', () => {
    const skillDir = path.join(workspaceRoot, 'tools/ai/src/lib/mcp');
    const stub = buildMcpSkillStub('ai', skillDir, 'cursor');

    expect(stub).toContain('name: ai');
    expect(stub).toContain('skill://ai');
    expect(stub).toContain('**ai** MCP');
    expect(stub).toContain('tools/ai/src/lib/mcp/SKILL.md');
    expect(stub).toContain('Canonical skill text');
    expect(stub).not.toContain('## MCP tools');
    expect(stub).toContain('Cursor Agent Skills');
  });

  it('collects Cursor, OpenCode, and Copilot stubs for ai, code, and graph', () => {
    const cursor = collectMcpOwnedSkillStubs('cursor', workspaceRoot);

    expect([...cursor.keys()].sort()).toEqual([
      '.cursor/skills/ai/SKILL.md',
      '.cursor/skills/code/SKILL.md',
      '.cursor/skills/graph/SKILL.md',
    ]);

    const opencode = collectMcpOwnedSkillStubs('opencode', workspaceRoot);

    expect([...opencode.keys()].sort()).toEqual([
      '.opencode/skills/ai/SKILL.md',
      '.opencode/skills/code/SKILL.md',
      '.opencode/skills/graph/SKILL.md',
    ]);

    const copilot = collectMcpOwnedSkillStubs('github-copilot', workspaceRoot);

    expect([...copilot.keys()].sort()).toEqual([
      '.github/skills/ai/SKILL.md',
      '.github/skills/code/SKILL.md',
      '.github/skills/graph/SKILL.md',
    ]);

    const graph = copilot.get('.github/skills/graph/SKILL.md') as string;

    expect(graph).toContain('name: graph');
    expect(graph).toContain('knowledge-graph');
    expect(graph).toContain('skill://graph');
    expect(graph).toContain('GitHub Copilot skills');
    expect(graph.split('\n').length).toBeLessThan(40);
  });

  it('skips missing packages outside this monorepo', () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agenstra-stub-'));

    try {
      expect(collectMcpOwnedSkillStubs('cursor', emptyRoot).size).toBe(0);
      expect(collectMcpOwnedSkillStubs('opencode', emptyRoot).size).toBe(0);
      expect(collectMcpOwnedSkillStubs('github-copilot', emptyRoot).size).toBe(0);
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it('maps publish metadata', () => {
    expect(MCP_OWNED_SKILL_PUBLISH.graph.mcpServerId).toBe('knowledge-graph');
    expect(MCP_OWNED_SKILL_PUBLISH.graph.promptName).toBe('graph');
  });
});
