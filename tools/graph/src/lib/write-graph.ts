import * as fs from 'fs';
import * as path from 'path';

import type { KnowledgeGraph } from './schema';

export interface WriteGraphJsonResult {
  path: string;
  /** False when an existing graph.json matched on version/nodes/edges (ignoring generatedAt). */
  changed: boolean;
}

/**
 * Structural equality for VCS-stable writes: ignore `generatedAt`.
 */
export function knowledgeGraphPayloadEquals(a: KnowledgeGraph, b: KnowledgeGraph): boolean {
  return (
    a.version === b.version &&
    JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
    JSON.stringify(a.edges) === JSON.stringify(b.edges)
  );
}

/**
 * Atomically write graph JSON to disk (temp file then rename).
 * Skips the write when the on-disk graph already matches aside from `generatedAt`,
 * so Git only sees the file when real content changed.
 */
export function writeGraphJsonAtomic(outDir: string, graph: KnowledgeGraph): WriteGraphJsonResult {
  fs.mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, 'graph.json');

  if (fs.existsSync(finalPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(finalPath, 'utf8')) as KnowledgeGraph;
      if (knowledgeGraphPayloadEquals(existing, graph)) {
        return { path: finalPath, changed: false };
      }
    } catch {
      // Corrupt or unreadable — rewrite below.
    }
  }

  const tempPath = path.join(outDir, `.graph.json.${process.pid}.tmp`);
  const content = `${JSON.stringify(graph, null, 2)}\n`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, finalPath);
  return { path: finalPath, changed: true };
}
