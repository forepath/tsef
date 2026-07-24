import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ProjectGraph } from '@nx/devkit';

import { discoverToolDirectories } from './discover-tools';
import { writeGraphHtml } from './write-html';

describe('discoverToolDirectories', () => {
  it('returns empty when tools/ is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-tools-missing-'));

    try {
      const result = discoverToolDirectories(tmp, { nodes: {}, dependencies: {} } as ProjectGraph);

      expect(result.nodes).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('emits tool nodes for non-Nx directories under tools/', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-tools-'));

    try {
      fs.mkdirSync(path.join(tmp, 'tools/ci'), { recursive: true });
      fs.mkdirSync(path.join(tmp, 'tools/graph'), { recursive: true });
      fs.mkdirSync(path.join(tmp, 'tools/node_modules'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'tools/readme.txt'), 'x', 'utf8');

      const projectGraph = {
        nodes: {
          graph: {
            name: 'graph',
            type: 'lib',
            data: { root: 'tools/graph' },
          },
        },
        dependencies: {},
      } as unknown as ProjectGraph;

      const result = discoverToolDirectories(tmp, projectGraph);
      const ids = result.nodes.map((n) => n.id).sort();

      expect(ids).toEqual(['tool:ci']);
      expect(result.nodes[0].attrs).toMatchObject({
        name: 'ci',
        root: 'tools/ci',
        type: 'tool',
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('writeGraphHtml', () => {
  it('writes graph.html atomically', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-html-'));

    try {
      const out = writeGraphHtml(tmp);

      expect(out).toBe(path.join(tmp, 'graph.html'));
      expect(fs.existsSync(out)).toBe(true);
      expect(fs.readFileSync(out, 'utf8')).toContain('Forepath Knowledge Graph');
      expect(fs.readdirSync(tmp).some((n) => n.includes('.tmp'))).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
