import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { KnowledgeGraph } from './schema';
import { knowledgeGraphPayloadEquals, writeGraphJsonAtomic } from './write-graph';

function sampleGraph(generatedAt: string): KnowledgeGraph {
  return {
    version: 1,
    generatedAt,
    nodes: [{ id: 'project:demo', type: 'lib', attrs: { name: 'demo', root: 'libs/demo', tags: [] } }],
    edges: [],
  };
}

describe('writeGraphJsonAtomic', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-write-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('writes a new graph.json', () => {
    const graph = sampleGraph('2026-01-01T00:00:00.000Z');
    const result = writeGraphJsonAtomic(tmp, graph);
    expect(result.changed).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    const written = JSON.parse(fs.readFileSync(result.path, 'utf8')) as KnowledgeGraph;
    expect(written.generatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(written.nodes).toHaveLength(1);
  });

  it('skips rewrite when only generatedAt would change', () => {
    const first = sampleGraph('2026-01-01T00:00:00.000Z');
    writeGraphJsonAtomic(tmp, first);
    const before = fs.readFileSync(path.join(tmp, 'graph.json'), 'utf8');

    const second = sampleGraph('2026-07-24T12:00:00.000Z');
    const result = writeGraphJsonAtomic(tmp, second);
    expect(result.changed).toBe(false);
    expect(fs.readFileSync(path.join(tmp, 'graph.json'), 'utf8')).toBe(before);
    expect(knowledgeGraphPayloadEquals(first, second)).toBe(true);
  });

  it('rewrites when nodes change', () => {
    writeGraphJsonAtomic(tmp, sampleGraph('2026-01-01T00:00:00.000Z'));
    const next: KnowledgeGraph = {
      ...sampleGraph('2026-07-24T12:00:00.000Z'),
      nodes: [
        { id: 'project:demo', type: 'lib', attrs: { name: 'demo', root: 'libs/demo', tags: [] } },
        { id: 'project:other', type: 'app', attrs: { name: 'other', root: 'apps/other', tags: [] } },
      ],
    };
    const result = writeGraphJsonAtomic(tmp, next);
    expect(result.changed).toBe(true);
    const written = JSON.parse(fs.readFileSync(result.path, 'utf8')) as KnowledgeGraph;
    expect(written.nodes).toHaveLength(2);
    expect(written.generatedAt).toBe('2026-07-24T12:00:00.000Z');
  });
});
