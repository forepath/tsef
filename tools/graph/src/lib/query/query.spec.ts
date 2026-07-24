import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  KnowledgeGraphIndex,
  collectImpactPaths,
  computeImpact,
  formatImpactMarkdown,
  recipeR1,
  recipeR2,
  recipeR3,
  recipeR5,
  resolveGraphJsonPath,
  resolveWorkspaceRoot,
} from './index';
import { IMPACT_COMMENT_MARKER } from './format-impact-markdown';
import { readPathsFile } from './impact';
import { buildMentionPatterns, findMentions, isNoisyMentionPath } from './mentions';
import { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from '../schema';

function node(id: string, type: KnowledgeNode['type'], attrs: Record<string, unknown> = {}): KnowledgeNode {
  return { id, type, attrs: attrs as unknown as KnowledgeNode['attrs'] };
}

function edge(from: string, to: string, type: KnowledgeEdge['type']): KnowledgeEdge {
  return { from, to, type };
}

describe('knowledge graph query recipes', () => {
  const graph: KnowledgeGraph = {
    version: 1,
    generatedAt: '2026-07-23T00:00:00.000Z',
    nodes: [
      node('project:demo-lib', 'lib', {
        name: 'demo-lib',
        root: 'libs/demo-lib',
        tags: ['type:lib'],
        type: 'lib',
        targets: [],
        domain: 'demo',
        context: 'core',
      }),
      node('project:demo-app', 'app', { name: 'demo-app', root: 'apps/demo-app', tags: [], type: 'app', targets: [] }),
      node('project:other-app', 'app', {
        name: 'other-app',
        root: 'apps/other-app',
        tags: [],
        type: 'app',
        targets: [],
      }),
      node('project:demo-shared', 'lib', {
        name: 'demo-shared',
        root: 'libs/demo-shared',
        tags: [],
        type: 'lib',
        targets: [],
      }),
      node('file:libs/demo-lib/spec/openapi.yaml', 'openapi', {
        path: 'libs/demo-lib/spec/openapi.yaml',
        languageOrKind: 'openapi',
        projectName: 'demo-lib',
      }),
      node('file:libs/demo-lib/spec/asyncapi.yaml', 'asyncapi', {
        path: 'libs/demo-lib/spec/asyncapi.yaml',
        languageOrKind: 'asyncapi',
        projectName: 'demo-lib',
      }),
      node('file:libs/demo-lib/src/demo.controller.ts', 'controller', {
        path: 'libs/demo-lib/src/demo.controller.ts',
        languageOrKind: 'ts',
        projectName: 'demo-lib',
      }),
      node('file:libs/demo-lib/src/demo.module.ts', 'module', {
        path: 'libs/demo-lib/src/demo.module.ts',
        languageOrKind: 'ts',
        projectName: 'demo-lib',
      }),
      node('file:libs/demo-lib/src/demo.service.ts', 'service', {
        path: 'libs/demo-lib/src/demo.service.ts',
        languageOrKind: 'ts',
        projectName: 'demo-lib',
      }),
      node('file:apps/demo-app/src/client.ts', 'controller', {
        path: 'apps/demo-app/src/client.ts',
        languageOrKind: 'ts',
        projectName: 'demo-app',
      }),
      node('api:HTTP:POST:/items', 'endpoint', {
        method: 'POST',
        pathOrChannel: '/items',
        operationId: 'createItem',
        specKind: 'openapi',
      }),
      node('api:HTTP:GET:/items', 'endpoint', {
        method: 'GET',
        pathOrChannel: '/items',
        operationId: 'listItems',
        specKind: 'openapi',
      }),
      node('api:channel:items.updated', 'channel', {
        pathOrChannel: 'items.updated',
        operationId: 'onItemsUpdated',
        specKind: 'asyncapi',
      }),
      node('concept:demo-items', 'concept', {
        title: 'Items',
        docPath: 'docs/demo/items.md',
        sectionAnchor: 'items',
      }),
      node('concept:demo-channels', 'concept', {
        title: 'Channels',
        docPath: 'docs/demo/channels.md',
        sectionAnchor: 'channels',
      }),
    ],
    edges: [
      edge('project:demo-app', 'project:demo-lib', 'depends_on'),
      edge('project:demo-app', 'project:demo-shared', 'depends_on'),
      edge('project:other-app', 'project:demo-shared', 'depends_on'),
      edge('project:demo-lib', 'project:demo-shared', 'depends_on'),
      edge('project:demo-lib', 'file:libs/demo-lib/spec/openapi.yaml', 'contains'),
      edge('project:demo-lib', 'file:libs/demo-lib/spec/asyncapi.yaml', 'contains'),
      edge('project:demo-lib', 'file:libs/demo-lib/src/demo.controller.ts', 'contains'),
      edge('project:demo-lib', 'file:libs/demo-lib/src/demo.module.ts', 'contains'),
      edge('project:demo-lib', 'file:libs/demo-lib/src/demo.service.ts', 'contains'),
      edge('file:libs/demo-lib/spec/openapi.yaml', 'api:HTTP:POST:/items', 'contains'),
      edge('file:libs/demo-lib/spec/openapi.yaml', 'api:HTTP:GET:/items', 'contains'),
      edge('file:libs/demo-lib/spec/asyncapi.yaml', 'api:channel:items.updated', 'contains'),
      edge('file:libs/demo-lib/src/demo.controller.ts', 'api:HTTP:POST:/items', 'implements'),
      edge('file:libs/demo-lib/src/demo.controller.ts', 'file:libs/demo-lib/src/demo.service.ts', 'injects'),
      edge('file:libs/demo-lib/src/demo.module.ts', 'file:libs/demo-lib/src/demo.service.ts', 'provides'),
      edge('file:apps/demo-app/src/client.ts', 'api:HTTP:POST:/items', 'calls'),
      edge('concept:demo-items', 'project:demo-lib', 'documents'),
      edge('concept:demo-items', 'api:HTTP:POST:/items', 'documents'),
      edge('concept:demo-channels', 'api:channel:items.updated', 'documents'),
    ],
  };

  const index = new KnowledgeGraphIndex(graph);

  it('recipeR1 returns deps, contains, endpoints, channels, injects, provides, and docs', () => {
    const result = recipeR1(index, 'demo-lib');
    expect(result.project.domain).toBe('demo');
    expect(result.project.context).toBe('core');
    expect(result.dependsOn.in.map((d) => d.id)).toContain('project:demo-app');
    expect(result.dependsOn.out.map((d) => d.id)).toContain('project:demo-shared');
    expect(result.containsTotals.controller).toBe(1);
    expect(result.containsTotals.module).toBe(1);
    expect(result.endpoints.some((e) => e.id === 'api:HTTP:POST:/items')).toBe(true);
    expect(result.channels.some((c) => c.id === 'api:channel:items.updated')).toBe(true);
    expect(result.documents.some((d) => d.docPath === 'docs/demo/items.md')).toBe(true);
    expect(result.endpointCount).toBe(2);
    expect(result.channelCount).toBe(1);
    expect(result.documentCount).toBe(2);
    expect(result.injectsFromSources.some((s) => s.from.type === 'controller')).toBe(true);
    expect(result.providesFromModules.some((s) => s.from.type === 'module')).toBe(true);
    expect(result.samples.caps.endpoints).toBe(80);
    expect(result.samples.note).toMatch(/samples/i);
  });

  it('recipeR1 respects maxPerType sample cap', () => {
    const result = recipeR1(index, 'demo-lib', { maxPerType: 1 });
    expect(result.containsByType.controller?.length).toBeLessThanOrEqual(1);
    expect(result.containsTotals.controller).toBe(1);
  });

  it('recipeR2 lists doc paths and can skip endpoint docs', () => {
    const withEndpoints = recipeR2(index, 'demo-lib');
    expect(withEndpoints.docPaths).toEqual(['docs/demo/channels.md', 'docs/demo/items.md']);

    const projectOnly = recipeR2(index, 'demo-lib', { includeEndpoints: false });
    expect(projectOnly.docPaths).toEqual(['docs/demo/items.md']);
  });

  it('recipeR3 resolves method+path, operationId, id, and channel', () => {
    const byPath = recipeR3(index, { method: 'post', path: 'items' });
    expect(byPath.owners.some((o) => o.id === 'project:demo-lib')).toBe(true);
    expect(byPath.implementers.some((i) => i.type === 'controller')).toBe(true);
    expect(byPath.callers.some((c) => c.id === 'file:apps/demo-app/src/client.ts')).toBe(true);
    expect(byPath.siblings.some((s) => s.id === 'api:HTTP:GET:/items')).toBe(true);
    expect(byPath.injects.some((i) => i.id === 'file:libs/demo-lib/src/demo.service.ts')).toBe(true);
    expect(byPath.documents.some((d) => d.docPath === 'docs/demo/items.md')).toBe(true);

    const byOp = recipeR3(index, { operationId: 'createItem' });
    expect(byOp.surface.id).toBe('api:HTTP:POST:/items');

    const byId = recipeR3(index, { id: 'api:HTTP:GET:/items' });
    expect(byId.surface.operationId).toBe('listItems');

    const byChannel = recipeR3(index, { channel: 'items.updated' });
    expect(byChannel.surface.id).toBe('api:channel:items.updated');
    expect(byChannel.documents.some((d) => d.docPath === 'docs/demo/channels.md')).toBe(true);

    const byChannelId = recipeR3(index, { channel: 'api:channel:items.updated' });
    expect(byChannelId.surface.id).toBe('api:channel:items.updated');
  });

  it('recipeR3 rejects incomplete or unknown queries', () => {
    expect(() => recipeR3(index, {})).toThrow(/Provide id, channel, operationId, or method\+path/);
    expect(() => recipeR3(index, { id: 'project:demo-lib' })).toThrow(/No endpoint\/channel/);
    expect(() => recipeR3(index, { channel: 'missing.channel' })).toThrow(/Unknown channel/);
    expect(() => recipeR3(index, { operationId: 'missingOp' })).toThrow(/Unknown operationId/);
    expect(() => recipeR3(index, { method: 'DELETE', path: '/missing' })).toThrow(/Unknown endpoint/);
  });

  it('recipeR5 finds keyword hits and rejects empty keyword', () => {
    const result = recipeR5(index, 'createItem');
    expect(result.hits.some((h) => h.id === 'api:HTTP:POST:/items')).toBe(true);
    expect(result.byType.endpoint).toBeGreaterThanOrEqual(1);
    expect(() => recipeR5(index, '   ')).toThrow(/keyword is required/);
  });

  it('resolveProject supports ids, fuzzy match, and errors', () => {
    expect(index.resolveProject('project:demo-lib').id).toBe('project:demo-lib');
    expect(index.resolveProject('demo-shared').id).toBe('project:demo-shared');
    expect(index.resolveProject('shared').id).toBe('project:demo-shared');
    expect(() => index.resolveProject('')).toThrow(/Project name is required/);
    expect(() => index.resolveProject('demo')).toThrow(/Ambiguous project/);
    expect(() => index.resolveProject('no-such-project')).toThrow(/Unknown project/);
  });

  it('projectForPath picks longest matching root', () => {
    expect(index.projectForPath('libs/demo-lib/src/x.ts')?.id).toBe('project:demo-lib');
    expect(index.projectForPath('README.md')).toBeNull();
  });

  it('computeImpact maps paths, shared deps, and unmapped files', () => {
    const result = computeImpact(
      index,
      ['libs/demo-lib/src/demo.controller.ts', 'apps/demo-app/src/main.ts', 'README.md'],
      { baseRef: 'origin/main' },
    );
    expect(result.projects.some((p) => p.project.id === 'project:demo-lib')).toBe(true);
    expect(result.projects.some((p) => p.project.id === 'project:demo-app')).toBe(true);
    expect(result.unmappedPaths).toContain('README.md');
    expect(result.sharedDependencyIds).toContain('project:demo-shared');
    expect(result.docPaths).toEqual(expect.arrayContaining(['docs/demo/items.md']));
  });

  it('collectImpactPaths and readPathsFile normalize explicit paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-impact-paths-'));
    try {
      const pathsFile = path.join(tmp, 'paths.txt');
      fs.writeFileSync(pathsFile, './libs/demo-lib/a.ts\n\n.git/config\nlibs/demo-lib/b.ts\n', 'utf8');

      expect(readPathsFile(pathsFile)).toEqual(['libs/demo-lib/a.ts', 'libs/demo-lib/b.ts']);
      expect(() => readPathsFile(path.join(tmp, 'missing.txt'))).toThrow(/Paths file not found/);

      const collected = collectImpactPaths({
        workspaceRoot: tmp,
        paths: ['./apps/demo-app/x.ts', ''],
        includeUncommitted: false,
      });
      expect(collected.paths).toEqual(['apps/demo-app/x.ts']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('fromFile and path helpers load graphs and resolve workspace roots', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-index-file-'));
    try {
      const graphDir = path.join(tmp, 'graph');
      fs.mkdirSync(graphDir, { recursive: true });
      const graphPath = path.join(graphDir, 'graph.json');
      fs.writeFileSync(graphPath, JSON.stringify(graph), 'utf8');

      const loaded = KnowledgeGraphIndex.fromFile(graphPath);
      expect(loaded.resolveProject('demo-lib').id).toBe('project:demo-lib');

      expect(resolveGraphJsonPath(tmp)).toBe(path.join(tmp, 'graph', 'graph.json'));
      expect(resolveGraphJsonPath(tmp, 'custom.json')).toBe(path.join(tmp, 'custom.json'));
      expect(resolveGraphJsonPath(tmp, '/abs/graph.json')).toBe('/abs/graph.json');

      const nested = path.join(tmp, 'apps', 'demo');
      fs.mkdirSync(nested, { recursive: true });
      expect(resolveWorkspaceRoot(nested)).toBe(tmp);

      fs.writeFileSync(path.join(tmp, 'bad.json'), JSON.stringify({ version: 1 }), 'utf8');
      expect(() => KnowledgeGraphIndex.fromFile(path.join(tmp, 'bad.json'))).toThrow(/Invalid knowledge graph/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('findMentions reports soft references outside depends_on', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-mentions-'));
    try {
      fs.mkdirSync(path.join(tmp, 'apps/other-app'), { recursive: true });
      fs.mkdirSync(path.join(tmp, 'libs/demo-lib'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'apps/other-app/note.ts'), "import 'demo-lib';\n", 'utf8');
      fs.writeFileSync(path.join(tmp, 'libs/demo-lib/src.ts'), 'export const x = 1;\n', 'utf8');

      const result = findMentions(index, 'demo-lib', { workspaceRoot: tmp, maxFiles: 20 });
      expect(result.softReferenceFiles.some((f) => f.path === 'apps/other-app/note.ts')).toBe(true);
      expect(result.declaredDependents.some((d) => d.id === 'project:demo-app')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('buildMentionPatterns omits short bare names but keeps root and package', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-patterns-'));
    try {
      fs.mkdirSync(path.join(tmp, 'tools/graph'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'tools/graph/package.json'), JSON.stringify({ name: '@forepath/graph' }), 'utf8');
      const patterns = buildMentionPatterns(tmp, {
        name: 'graph',
        root: 'tools/graph',
        tags: [],
        type: 'tool',
        targets: [],
      });
      expect(patterns).toEqual(expect.arrayContaining(['tools/graph', '@forepath/graph']));
      expect(patterns).not.toContain('graph');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('isNoisyMentionPath filters caches and fixtures', () => {
    expect(isNoisyMentionPath('.angular/cache/x.js')).toBe(true);
    expect(isNoisyMentionPath('apps/x/vite/deps/chunk.js')).toBe(true);
    expect(isNoisyMentionPath('tools/graph/src/lib/__fixtures__/mini-workspace/a.ts')).toBe(true);
    expect(isNoisyMentionPath('apps/demo/src/main.ts')).toBe(false);
  });

  it('formatImpactMarkdown renders sticky overview with marker and truncations', () => {
    const impact = computeImpact(index, ['libs/demo-lib/src/demo.controller.ts'], { baseRef: 'origin/main' });
    const md = formatImpactMarkdown(impact);
    expect(md.startsWith(IMPACT_COMMENT_MARKER)).toBe(true);
    expect(md).toContain('Knowledge graph blast radius');
    expect(md).toContain('| Project |');
    expect(md).toContain('demo-lib');
    expect(md).toContain('Docs to review');

    const empty = formatImpactMarkdown({
      recipe: 'impact',
      paths: ['orphan.txt'],
      mappings: [{ path: 'orphan.txt', project: null }],
      projects: [],
      unmappedPaths: Array.from({ length: 12 }, (_, i) => `u${i}.txt`),
      sharedDependencyIds: Array.from({ length: 14 }, (_, i) => `project:shared-${i}`),
      docPaths: Array.from({ length: 14 }, (_, i) => `docs/d${i}.md`),
    });
    expect(empty).toContain('No owning projects mapped');
    expect(empty).toContain('Shared dependencies');
    expect(empty).toContain('…and 2 more');
    expect(empty).toContain('Unmapped paths');

    const withPipe = formatImpactMarkdown({
      recipe: 'impact',
      paths: ['a'],
      mappings: [],
      projects: [
        {
          project: { id: 'project:a|b', type: 'lib', label: 'a|b' },
          matchedPaths: ['a'],
          r1: {
            recipe: 'R1',
            project: { id: 'project:a|b', type: 'lib', label: 'a|b' },
            dependsOn: { in: [], out: [] },
            containsByType: {},
            containsTotals: {},
            endpoints: [],
            channels: [],
            documents: [],
            endpointCount: 0,
            channelCount: 0,
            documentCount: 0,
            injectsFromSources: [],
            providesFromModules: [],
            samples: { note: '', caps: {} as never },
          },
        },
      ],
      unmappedPaths: [],
      sharedDependencyIds: [],
      docPaths: [],
    });
    expect(withPipe).toContain('a\\|b');
  });
});
