import * as fs from 'fs';
import * as path from 'path';

import { createProjectGraphAsync, Tree, workspaceRoot } from '@nx/devkit';

import { buildKnowledgeGraph, writeKnowledgeGraphArtifacts } from '../../lib/build-knowledge-graph';

import type { GenerateKgGeneratorSchema } from './schema';

/**
 * Nx generator: build and write the monorepo knowledge graph.
 * Writes through the filesystem (same as CLI) so pre-commit and generate stay aligned.
 */
export async function generateKgGenerator(tree: Tree, options: GenerateKgGeneratorSchema): Promise<void> {
  const outDir = path.resolve(workspaceRoot, options.outDir ?? 'graph');
  const projectGraph = await createProjectGraphAsync({ exitOnError: true });
  const graph = buildKnowledgeGraph({
    projectGraph,
    workspaceRoot,
  });

  const { jsonChanged } = writeKnowledgeGraphArtifacts({
    graph,
    outDir,
    skipHtml: options.skipHtml === true,
  });

  const jsonRel = path.relative(workspaceRoot, path.join(outDir, 'graph.json')).replace(/\\/g, '/');
  // Only touch the Nx tree when graph.json actually changed (ignore generatedAt-only churn).
  if (jsonChanged) {
    tree.write(jsonRel, fs.readFileSync(path.join(outDir, 'graph.json'), 'utf8'));
  }

  if (options.skipHtml !== true) {
    const htmlPath = path.join(outDir, 'graph.html');
    const htmlRel = path.relative(workspaceRoot, htmlPath).replace(/\\/g, '/');
    if (fs.existsSync(htmlPath)) {
      tree.write(htmlRel, fs.readFileSync(htmlPath, 'utf8'));
    }
  }
}

export default generateKgGenerator;
