import * as fs from 'fs';
import * as path from 'path';

/**
 * Walk up from startDir until nx.json or .agenstra is found.
 */
export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);

  for (;;) {
    if (fs.existsSync(path.join(dir, 'nx.json')) || fs.existsSync(path.join(dir, '.agenstra'))) {
      return dir;
    }

    const parent = path.dirname(dir);

    if (parent === dir) {
      return path.resolve(startDir);
    }

    dir = parent;
  }
}

/**
 * Resolve absolute path to the workspace `.agenstra` directory.
 */
export function resolveAgenstraDir(workspaceRoot?: string, agenstraPath?: string): string {
  if (agenstraPath) {
    const resolved = path.isAbsolute(agenstraPath) ? agenstraPath : path.resolve(process.cwd(), agenstraPath);

    return resolved.endsWith('.agenstra') ? resolved : path.join(resolved, '.agenstra');
  }

  const root = workspaceRoot ?? resolveWorkspaceRoot();

  return path.join(root, '.agenstra');
}
