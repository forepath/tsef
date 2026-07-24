import * as fs from 'fs';
import * as path from 'path';

export interface GeneratorMeta {
  name: string;
  description: string;
  factory: string;
  schemaPath: string;
}

interface GeneratorsJson {
  generators: Record<string, { factory: string; schema: string; description?: string }>;
}

/**
 * Resolve the @forepath/code package root (contains generators.json).
 */
export function resolveCodePackageRoot(fromDir: string = __dirname): string {
  let dir = path.resolve(fromDir);
  for (;;) {
    const candidate = path.join(dir, 'generators.json');
    if (fs.existsSync(candidate)) {
      return dir;
    }
    // Prefer tools/code when walking from dist/tools/code/src/...
    if (path.basename(dir) === 'code' && fs.existsSync(path.join(dir, 'project.json'))) {
      const srcGenerators = path.join(dir, 'generators.json');
      if (fs.existsSync(srcGenerators)) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Unable to locate @forepath/code package root (generators.json)');
    }
    dir = parent;
  }
}

export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'nx.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return path.resolve(startDir);
    }
    dir = parent;
  }
}

export function listGenerators(packageRoot?: string): GeneratorMeta[] {
  const root = packageRoot ?? resolveCodePackageRoot();
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'generators.json'), 'utf8')) as GeneratorsJson;
  return Object.entries(raw.generators).map(([name, entry]) => ({
    name,
    description: entry.description ?? name,
    factory: entry.factory,
    schemaPath: path.resolve(root, entry.schema),
  }));
}

export function getGeneratorSchema(
  generatorName: string,
  packageRoot?: string,
): { name: string; description: string; schemaPath: string; schema: Record<string, unknown> } {
  const generators = listGenerators(packageRoot);
  const meta = generators.find((g) => g.name === generatorName);
  if (!meta) {
    const known = generators.map((g) => g.name).join(', ');
    throw new Error(`Unknown generator "${generatorName}". Known: ${known}`);
  }
  if (!fs.existsSync(meta.schemaPath)) {
    throw new Error(`Schema file not found for ${generatorName}: ${meta.schemaPath}`);
  }
  const schema = JSON.parse(fs.readFileSync(meta.schemaPath, 'utf8')) as Record<string, unknown>;
  return {
    name: meta.name,
    description: meta.description,
    schemaPath: meta.schemaPath,
    schema,
  };
}
